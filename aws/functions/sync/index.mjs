// 同期 API（AWS Lambda 関数 URL）。POST のみ。
//
// リクエスト：
//   Authorization: Bearer <Cognito のアクセストークン>
//   { since: number, changes: [{ id, version, deleted, payload }] }   // payload = { dateKey, item }
// レスポンス：
//   { cursor: number, changes: [{ id, version, deleted, payload }] }
//
// - ユーザーはトークンの sub（Cognito のユーザー ID）で見分ける。ほかのユーザーのデータには触れない。
// - 同じ記録は version（変更時刻）が新しい方を残す。削除は deleted の行として残す。
// - ユーザーごとに通し番号（counter）を持ち、各行には書き込んだときの番号（seq）を付ける。
//   since より後の行だけを返す。
// - 同時に書き込み中の端末がいる間は cursor を進めない（書き込み途中の行を取りこぼさないため）。

import {
  DynamoDBClient,
  PutItemCommand,
  QueryCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { randomUUID } from "node:crypto";
import { verifyAccessToken } from "./jwt.mjs";

const MAX_BODY_BYTES = 2 * 1024 * 1024;
const MAX_CHANGES = 200; // 1 回に受け付ける件数（端末側で分けて送る）
const MAX_PAYLOAD_BYTES = 50 * 1024;
const WRITE_CONCURRENCY = 8;
const INFLIGHT_EXPIRE_MS = 60 * 1000; // 書き込み中の印がこれより古ければ無視する（Lambda の制限時間より長く）
const META_ID = "#meta";

const {
  TABLE_NAME,
  USER_POOL_ID,
  USER_POOL_CLIENT_ID,
  AWS_REGION,
  DYNAMODB_ENDPOINT, // ローカルでのテスト用
  COGNITO_ISSUER, // ローカルでのテスト用
} = process.env;

const db = new DynamoDBClient(DYNAMODB_ENDPOINT ? { endpoint: DYNAMODB_ENDPOINT } : {});
const issuer = COGNITO_ISSUER ?? `https://cognito-idp.${AWS_REGION}.amazonaws.com/${USER_POOL_ID}`;

export async function handler(event) {
  if (event.requestContext?.http?.method !== "POST") return reply(405, { error: "methodNotAllowed" });

  const token = event.headers?.authorization?.match(/^Bearer (\S+)$/)?.[1];
  const claims = token && (await verifyAccessToken(token, { issuer, clientId: USER_POOL_CLIENT_ID }));
  if (!claims) return reply(401, { error: "unauthorized" });

  const text = event.isBase64Encoded ? Buffer.from(event.body ?? "", "base64").toString("utf8") : (event.body ?? "");
  if (Buffer.byteLength(text) > MAX_BODY_BYTES) return reply(413, { error: "tooLarge" });

  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return reply(400, { error: "badRequest" });
  }
  const changes = validateChanges(body.changes);
  const since = Number.isSafeInteger(body.since) && body.since >= 0 ? body.since : null;
  if (!changes || since === null) return reply(400, { error: "badRequest" });

  const result = await sync(claims.sub, since, changes);
  return reply(200, result);
}

/** 1 回分の同期（テストから直接呼べるように分けている） */
export async function sync(userId, since, changes, now = Date.now()) {
  if (changes.length) await writeChanges(userId, changes, now);

  // このユーザーの行をすべて読み、必要なものだけ返す（強い整合性で読むので、書き込み直後でも漏れない）
  const pushed = new Set(changes.map((change) => change.id));
  const rows = await queryAll(userId);
  const meta = rows.find((row) => row.itemId.S === META_ID);
  const counter = Number(meta?.counter?.N ?? 0);
  const othersWriting = (meta?.inflight?.SS ?? []).some((mark) => now - Number(mark.split(":")[0]) < INFLIGHT_EXPIRE_MS);

  const out = [];
  for (const row of rows) {
    const id = row.itemId.S;
    if (id === META_ID) continue;
    if (Number(row.seq.N) > since || pushed.has(id)) {
      out.push({
        id,
        version: Number(row.version.N),
        deleted: row.deleted.BOOL,
        payload: row.payload ? JSON.parse(row.payload.S) : null,
      });
    }
  }
  return { cursor: othersWriting ? since : counter, changes: out };
}

async function writeChanges(userId, changes, now) {
  // 通し番号を 1 つ進め、同時に「書き込み中」の印を付ける（1 回の操作で行う）
  const mark = `${now}:${randomUUID()}`;
  const updated = await db.send(
    new UpdateItemCommand({
      TableName: TABLE_NAME,
      Key: { userId: { S: userId }, itemId: { S: META_ID } },
      UpdateExpression: "ADD #counter :one, #inflight :mark",
      ExpressionAttributeNames: { "#counter": "counter", "#inflight": "inflight" },
      ExpressionAttributeValues: { ":one": { N: "1" }, ":mark": { SS: [mark] } },
      ReturnValues: "UPDATED_NEW",
    }),
  );
  const seq = updated.Attributes.counter.N;

  try {
    // version が新しいときだけ上書きする
    await runLimited(changes, WRITE_CONCURRENCY, async (change) => {
      const item = {
        userId: { S: userId },
        itemId: { S: change.id },
        version: { N: String(change.version) },
        deleted: { BOOL: change.deleted },
        seq: { N: seq },
      };
      if (!change.deleted) item.payload = { S: JSON.stringify(change.payload) };
      try {
        await db.send(
          new PutItemCommand({
            TableName: TABLE_NAME,
            Item: item,
            ConditionExpression: "attribute_not_exists(itemId) OR #version < :version",
            ExpressionAttributeNames: { "#version": "version" },
            ExpressionAttributeValues: { ":version": { N: String(change.version) } },
          }),
        );
      } catch (err) {
        if (err.name !== "ConditionalCheckFailedException") throw err; // 古い変更は捨てる（正常）
      }
    });
  } finally {
    await db.send(
      new UpdateItemCommand({
        TableName: TABLE_NAME,
        Key: { userId: { S: userId }, itemId: { S: META_ID } },
        UpdateExpression: "DELETE #inflight :mark",
        ExpressionAttributeNames: { "#inflight": "inflight" },
        ExpressionAttributeValues: { ":mark": { SS: [mark] } },
      }),
    );
  }
}

async function queryAll(userId) {
  const rows = [];
  let startKey;
  do {
    const page = await db.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "userId = :u",
        ExpressionAttributeValues: { ":u": { S: userId } },
        ConsistentRead: true,
        ExclusiveStartKey: startKey,
      }),
    );
    rows.push(...page.Items);
    startKey = page.LastEvaluatedKey;
  } while (startKey);
  return rows;
}

/** 送られてきた changes の形を確認する。問題があれば null */
export function validateChanges(changes) {
  if (!Array.isArray(changes) || changes.length > MAX_CHANGES) return null;
  const ok = changes.every((c) => {
    if (typeof c?.id !== "string" || !c.id || c.id.length > 128 || c.id === META_ID) return false;
    if (!Number.isSafeInteger(c.version) || c.version < 0 || typeof c.deleted !== "boolean") return false;
    if (c.deleted) return c.payload === null;
    return (
      typeof c.payload?.dateKey === "string" &&
      typeof c.payload?.item === "object" &&
      JSON.stringify(c.payload).length <= MAX_PAYLOAD_BYTES
    );
  });
  return ok ? changes.map(({ id, version, deleted, payload }) => ({ id, version, deleted, payload })) : null;
}

/** 同時実行数を limit 個までにして tasks を処理する */
async function runLimited(items, limit, task) {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) await task(queue.shift());
  });
  await Promise.all(workers);
}

function reply(statusCode, json) {
  return { statusCode, headers: { "content-type": "application/json" }, body: JSON.stringify(json) };
}
