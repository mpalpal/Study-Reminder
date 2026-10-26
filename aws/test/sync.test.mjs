// 同期 Lambda のテスト。ローカルの DynamoDB 互換データベースと Cognito の代わりを使い、
// 本番と同じ handler を HTTP 経由で呼ぶ。
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startLocalBackend } from "./localBackend.mjs";

let backend;
let tokenA;
let tokenB;

beforeAll(async () => {
  backend = await startLocalBackend();
  for (const name of ["alice", "bob"]) {
    backend.cognito.users.set(name, { sub: `sub-${name}`, username: name, password: "password1" });
  }
  tokenA = await backend.cognito.issueAccessToken("alice");
  tokenB = await backend.cognito.issueAccessToken("bob");
});
afterAll(() => backend?.close());

const call = async (token, body) => {
  const res = await fetch(backend.syncUrl, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
};
const change = (id, version, title) => ({
  id,
  version,
  deleted: false,
  payload: { dateKey: "2026-10-25", item: { id, title, body: "b", createdAt: 1, updatedAt: 1 } },
});

describe("同期 Lambda", () => {
  it("トークンがない・偽物・期限切れなら 401", async () => {
    expect((await call("", { since: 0, changes: [] })).status).toBe(401);
    const forged = tokenA.slice(0, -4) + "AAAA";
    expect((await call(forged, { since: 0, changes: [] })).status).toBe(401);

    backend.cognito.state.accessTokenSeconds = -10;
    const expired = await backend.cognito.issueAccessToken("alice");
    backend.cognito.state.accessTokenSeconds = 3600;
    expect((await call(expired, { since: 0, changes: [] })).status).toBe(401);
  });

  it("初めてのユーザーは空。送った記録が保存され、通し番号が進む", async () => {
    expect((await call(tokenA, { since: 0, changes: [] })).json).toEqual({ cursor: 0, changes: [] });
    const r = await call(tokenA, { since: 0, changes: [change("a", 10, "A")] });
    expect(r.status).toBe(200);
    expect(r.json.cursor).toBe(1);
    expect(r.json.changes).toEqual([change("a", 10, "A")]);
  });

  it("古い変更は採用されず、今の内容が返る", async () => {
    const r = await call(tokenA, { since: 1, changes: [change("a", 5, "古い")] });
    expect(r.json.changes).toEqual([change("a", 10, "A")]);
  });

  it("新しい変更と削除は採用され、since 以降だけが返る", async () => {
    const r = await call(tokenA, {
      since: 1,
      changes: [change("a", 20, "A2"), { id: "b", version: 21, deleted: true, payload: null }],
    });
    expect(r.json.cursor).toBe(3); // 採用されなかった前回の送信でも番号は 1 つ進む
    expect(r.json.changes.map((c) => c.id).sort()).toEqual(["a", "b"]);
    expect((await call(tokenA, { since: 3, changes: [] })).json).toEqual({ cursor: 3, changes: [] });
  });

  it("ほかのユーザーのデータは見えない", async () => {
    const r = await call(tokenB, { since: 0, changes: [] });
    expect(r.json).toEqual({ cursor: 0, changes: [] });
  });

  it("形のおかしいリクエストは 400、多すぎると 400", async () => {
    expect((await call(tokenA, { since: 0, changes: [{ id: "x", version: 1.5, deleted: false, payload: {} }] })).status).toBe(400);
    expect((await call(tokenA, { since: 0, changes: [{ id: "#meta", version: 1, deleted: true, payload: null }] })).status).toBe(400);
    const many = Array.from({ length: 201 }, (_, i) => change(`m${i}`, 1, "m"));
    expect((await call(tokenA, { since: 0, changes: many })).status).toBe(400);
  });

  it("200 件をまとめて送れる", async () => {
    const many = Array.from({ length: 200 }, (_, i) => change(`bulk-${i}`, 100, `T${i}`));
    const r = await call(tokenB, { since: 0, changes: many });
    expect(r.status).toBe(200);
    expect(r.json.changes).toHaveLength(200);
  });

  it("別の端末が書き込み中なら cursor を進めない（取りこぼし防止）", async () => {
    const { sync } = await import("../functions/sync/index.mjs");
    const { DynamoDBClient, UpdateItemCommand } = await import("@aws-sdk/client-dynamodb");
    const client = new DynamoDBClient({ endpoint: process.env.DYNAMODB_ENDPOINT });
    await client.send(
      new UpdateItemCommand({
        TableName: process.env.TABLE_NAME,
        Key: { userId: { S: "sub-alice" }, itemId: { S: "#meta" } },
        UpdateExpression: "ADD #i :m",
        ExpressionAttributeNames: { "#i": "inflight" },
        ExpressionAttributeValues: { ":m": { SS: [`${Date.now()}:other-device`] } },
      }),
    );
    expect((await sync("sub-alice", 1, [])).cursor).toBe(1);
    // 古い印（途中で止まった書き込み）は無視される
    expect((await sync("sub-alice", 1, [], Date.now() + 120_000)).cursor).toBe(3);
    client.destroy();
  });
});
