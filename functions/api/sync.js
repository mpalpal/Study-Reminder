// 同期 API（Cloudflare Pages Functions）。POST /api/sync
//
// リクエスト：
//   Authorization: Bearer <認証トークン（同期キーから作った 64 桁の 16 進数）>
//   { create?: boolean, since: number, changes: [{ id, version, deleted, payload }] }
// レスポンス：
//   { cursor: number, changes: [{ id, version, deleted, payload }] }
//
// - サーバーは中身を読まない。payload は端末側で暗号化済みの文字列。
// - トークンはそのまま保存せず、SHA-256 したものを「スペース ID」として使う。
// - 同じ記録は version（変更時刻）が新しい方を残す。
// - cursor はスペースごとの通し番号。since より後の変更だけを返す。
//
// 必要な設定：Pages プロジェクトに D1 データベースを変数名 DB でバインドする。

const MAX_BODY_BYTES = 5 * 1024 * 1024;
const MAX_CHANGES = 5000;
const MAX_PAYLOAD_LENGTH = 256 * 1024;
const CHUNK_BYTES = 900 * 1024; // 1 文に渡すデータの上限（D1 の 1 値あたり 2MB 制限より小さく）

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS spaces (
     id TEXT PRIMARY KEY,
     seq INTEGER NOT NULL DEFAULT 0,
     created_at INTEGER NOT NULL,
     updated_at INTEGER NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS items (
     space_id TEXT NOT NULL,
     id TEXT NOT NULL,
     version INTEGER NOT NULL,
     deleted INTEGER NOT NULL DEFAULT 0,
     payload TEXT,
     seq INTEGER NOT NULL,
     PRIMARY KEY (space_id, id)
   )`,
  `CREATE INDEX IF NOT EXISTS items_by_seq ON items (space_id, seq)`,
];

let schemaReady = null; // テーブル作成はインスタンスごとに 1 回だけ

export async function onRequestPost({ request, env }) {
  if (!env.DB) return error(503, "notConfigured");

  const token = request.headers.get("Authorization")?.match(/^Bearer ([0-9a-f]{64})$/)?.[1];
  if (!token) return error(401, "unauthorized");

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return error(413, "tooLarge");

  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return error(400, "badRequest");
  }
  const changes = validateChanges(body.changes);
  const since = Number.isSafeInteger(body.since) && body.since >= 0 ? body.since : null;
  if (!changes || since === null) return error(400, "badRequest");

  const db = env.DB;
  schemaReady ??= db.batch(SCHEMA.map((sql) => db.prepare(sql))).catch((err) => {
    schemaReady = null;
    throw err;
  });
  await schemaReady;

  const spaceId = await sha256Hex(token);
  const now = Date.now();

  if (body.create) {
    try {
      await db
        .prepare("INSERT INTO spaces (id, seq, created_at, updated_at) VALUES (?1, 0, ?2, ?2)")
        .bind(spaceId, now)
        .run();
    } catch {
      return error(409, "exists");
    }
  } else {
    const space = await db.prepare("SELECT 1 FROM spaces WHERE id = ?1").bind(spaceId).first();
    if (!space) return error(404, "notFound");
  }

  // まとめて 1 つのトランザクションで実行する
  const statements = [];
  if (changes.length) {
    statements.push(db.prepare("UPDATE spaces SET seq = seq + 1, updated_at = ?2 WHERE id = ?1").bind(spaceId, now));
    for (const chunk of chunkBySize(changes)) {
      statements.push(
        db
          .prepare(
            `INSERT INTO items (space_id, id, version, deleted, payload, seq)
             SELECT ?1, json_extract(value, '$.id'), json_extract(value, '$.version'),
                    json_extract(value, '$.deleted'), json_extract(value, '$.payload'),
                    (SELECT seq FROM spaces WHERE id = ?1)
             FROM json_each(?2) WHERE true
             ON CONFLICT (space_id, id) DO UPDATE SET
               version = excluded.version, deleted = excluded.deleted,
               payload = excluded.payload, seq = excluded.seq
             WHERE excluded.version > items.version`,
          )
          .bind(spaceId, JSON.stringify(chunk)),
      );
    }
  }
  // 前回以降の変更と、今回送られてきた記録の最新の状態を返す
  statements.push(
    db
      .prepare(
        `SELECT id, version, deleted, payload FROM items
         WHERE space_id = ?1 AND (seq > ?2 OR id IN (SELECT value FROM json_each(?3)))`,
      )
      .bind(spaceId, since, JSON.stringify(changes.map((change) => change.id))),
    db.prepare("SELECT seq FROM spaces WHERE id = ?1").bind(spaceId),
  );

  const results = await db.batch(statements);
  const rows = results.at(-2).results;
  const cursor = results.at(-1).results[0].seq;

  return Response.json({
    cursor,
    changes: rows.map((row) => ({ ...row, deleted: Boolean(row.deleted) })),
  });
}

/** 送られてきた changes の形を確認する。問題があれば null */
function validateChanges(changes) {
  if (!Array.isArray(changes) || changes.length > MAX_CHANGES) return null;
  const valid = changes.every(
    (c) =>
      typeof c?.id === "string" &&
      c.id.length > 0 &&
      c.id.length <= 128 &&
      Number.isSafeInteger(c.version) &&
      c.version >= 0 &&
      typeof c.deleted === "boolean" &&
      (c.deleted ? c.payload === null : typeof c.payload === "string" && c.payload.length <= MAX_PAYLOAD_LENGTH),
  );
  return valid ? changes.map(({ id, version, deleted, payload }) => ({ id, version, deleted, payload })) : null;
}

function* chunkBySize(changes) {
  let chunk = [];
  let size = 0;
  for (const change of changes) {
    const length = (change.payload?.length ?? 0) + 100;
    if (chunk.length && size + length > CHUNK_BYTES) {
      yield chunk;
      chunk = [];
      size = 0;
    }
    chunk.push(change);
    size += length;
  }
  if (chunk.length) yield chunk;
}

async function sha256Hex(text) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

function error(status, code) {
  return Response.json({ error: code }, { status });
}
