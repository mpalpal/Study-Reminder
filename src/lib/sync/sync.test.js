import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { applyRemoteChanges, changedIds } from "./changes.js";
import { createSyncEngine } from "./engine.js";
import { createCognitoClient } from "../auth/cognito.js";
import { createAuthSession, AUTH_STORAGE_KEY } from "../auth/session.js";
import { startLocalBackend } from "../../../aws/test/localBackend.mjs";

const item = (id, title, createdAt = 1, extra = {}) => ({ id, title, body: "b", createdAt, updatedAt: createdAt, ...extra });

describe("差分と取り込み", () => {
  const logs = { "2026-10-24": { items: [item("a", "A", 2), item("b", "B", 1)] } };

  it("追加・変更・削除された id を返す", () => {
    const next = { "2026-10-24": { items: [item("c", "C", 3), { ...item("a", "A", 2), reviews: { 1: 5 } }] } };
    expect(changedIds(logs, next).sort()).toEqual(["a", "b", "c"]);
    expect(changedIds(logs, logs)).toEqual([]);
  });

  it("ほかの端末の追加・更新・削除を取り込み、新しい順に並べる", () => {
    const next = applyRemoteChanges(logs, [
      { id: "b", deleted: true },
      { id: "c", dateKey: "2026-10-24", item: item("c", "C", 3) },
      { id: "d", dateKey: "2026-10-20", item: item("d", "D", 1) },
      { id: "a", dateKey: "2026-10-24", item: item("a", "A2", 2) },
    ]);
    expect(next["2026-10-24"].items.map((i) => i.title)).toEqual(["C", "A2"]);
    expect(next["2026-10-20"].items.map((i) => i.id)).toEqual(["d"]);
  });
});

// ---- ここから先は、手元で動かした AWS 側（Cognito の代わり・DynamoDB 互換・本物の同期 Lambda）を使う ----
let backend;
beforeAll(async () => {
  backend = await startLocalBackend();
});
afterAll(() => backend?.close());

/** 1 台の端末（記録データ + ログイン + 同期）を再現する */
function createDevice(initialLogs = {}) {
  const store = new Map();
  const storage = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, v),
    removeItem: (k) => store.delete(k),
  };
  const cognito = createCognitoClient({ clientId: backend.cognito.clientId, endpoint: backend.cognito.url });
  const device = { logs: initialLogs, storage: store };
  device.auth = createAuthSession({ cognito, storage });
  device.engine = createSyncEngine({
    getLogs: () => device.logs,
    applyLogs: (next) => (device.logs = next),
    getAccessToken: () => device.auth.getAccessToken(),
    onUnauthorized: () => device.auth.markExpired(),
    endpoint: backend.syncUrl,
    storage,
  });
  device.edit = (next) => {
    device.engine.recordChanges(device.logs, next);
    device.logs = next;
  };
  device.signUp = async (u, p) => {
    await device.auth.signUp(u, p);
    await device.engine.start();
  };
  device.signIn = async (u, p) => {
    await device.auth.signIn(u, p);
    await device.engine.start();
  };
  return device;
}

let n = 0;
const uniqueName = () => `user${Date.now() % 100000}${n++}`;

describe("ログイン", () => {
  it("新規登録するとログインしたままになり、トークンは端末に保存される", async () => {
    const phone = createDevice();
    const name = uniqueName();
    await phone.auth.signUp(name, "password123");
    expect(phone.auth.getSnapshot()).toEqual({ loggedIn: true, username: name, expired: false });
    expect(JSON.parse(phone.storage.get(AUTH_STORAGE_KEY)).refreshToken).toBeTruthy();
    expect(await phone.auth.getAccessToken()).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
  });

  it("同じユーザー名・短いパスワード・形のおかしいユーザー名・間違ったパスワードはエラー", async () => {
    const name = uniqueName();
    await createDevice().auth.signUp(name, "password123");
    await expect(createDevice().auth.signUp(name.toUpperCase(), "password123")).rejects.toMatchObject({ code: "usernameExists" });
    await expect(createDevice().auth.signUp(uniqueName(), "short")).rejects.toMatchObject({ code: "invalidPassword" });
    await expect(createDevice().auth.signUp("日本語", "password123")).rejects.toMatchObject({ code: "invalidUsername" });
    await expect(createDevice().auth.signIn(name, "wrongpass")).rejects.toMatchObject({ code: "wrongCredentials" });
  });

  it("アクセストークンが切れたら、ログインし直さずに自動で取り直す", async () => {
    const phone = createDevice();
    backend.cognito.state.accessTokenSeconds = 30; // 余裕（60 秒）より短い → 毎回取り直す
    await phone.auth.signUp(uniqueName(), "password123");
    const before = backend.cognito.state.issued;
    await phone.auth.getAccessToken();
    expect(backend.cognito.state.issued).toBe(before + 1);
    backend.cognito.state.accessTokenSeconds = 3600;
  });

  it("ログアウトするとトークンを消し、サーバー側でも無効にする", async () => {
    const phone = createDevice();
    await phone.auth.signUp(uniqueName(), "password123");
    const refreshToken = JSON.parse(phone.storage.get(AUTH_STORAGE_KEY)).refreshToken;
    await phone.auth.signOut();
    expect(phone.auth.getSnapshot().loggedIn).toBe(false);
    expect(phone.storage.has(AUTH_STORAGE_KEY)).toBe(false);
    const cognito = createCognitoClient({ clientId: backend.cognito.clientId, endpoint: backend.cognito.url });
    await expect(cognito.refresh(refreshToken)).rejects.toMatchObject({ code: "wrongCredentials" });
  });
});

describe("同期（2 台の端末）", () => {
  it("ログインすると、この端末の記録がアカウントに保存され、別の端末でログインすると復元される", async () => {
    const name = uniqueName();
    const phone = createDevice({ "2026-10-23": { items: [item("a", "ログイン前の記録")] } });
    await phone.signUp(name, "password123");
    expect(phone.engine.getSnapshot()).toMatchObject({ active: true, pendingCount: 0, error: null });

    const mac = createDevice();
    await mac.signIn(name, "password123");
    expect(mac.logs["2026-10-23"].items[0].title).toBe("ログイン前の記録");
  });

  it("追加・チェック・削除が行き来する", async () => {
    const name = uniqueName();
    const phone = createDevice({ "2026-10-23": { items: [item("a", "A")] } });
    const mac = createDevice();
    await phone.signUp(name, "password123");
    await mac.signIn(name, "password123");

    mac.edit({ ...mac.logs, "2026-10-24": { items: [item("b", "B", 5)] } });
    await mac.engine.sync();
    await phone.engine.sync();
    expect(phone.logs["2026-10-24"].items[0].title).toBe("B");

    phone.edit({ ...phone.logs, "2026-10-23": { items: [{ ...item("a", "A"), reviews: { 1: 9 } }] } });
    await phone.engine.sync();
    await mac.engine.sync();
    expect(mac.logs["2026-10-23"].items[0].reviews).toEqual({ 1: 9 });

    const { "2026-10-24": _gone, ...withoutB } = phone.logs;
    phone.edit(withoutB);
    await phone.engine.sync();
    await mac.engine.sync();
    expect(mac.logs["2026-10-24"]).toBeUndefined();
  });

  it("同じ記録を両方で変えたら、あとから変えた方が残る", async () => {
    const name = uniqueName();
    const phone = createDevice({ "2026-10-23": { items: [item("a", "A")] } });
    const mac = createDevice();
    await phone.signUp(name, "password123");
    await mac.signIn(name, "password123");

    phone.edit({ "2026-10-23": { items: [item("a", "iPhoneで変更")] } });
    await new Promise((r) => setTimeout(r, 5));
    mac.edit({ "2026-10-23": { items: [item("a", "Macで変更（後）")] } });
    await phone.engine.sync();
    await mac.engine.sync();
    await phone.engine.sync();
    expect(phone.logs["2026-10-23"].items[0].title).toBe("Macで変更（後）");
    expect(mac.logs["2026-10-23"].items[0].title).toBe("Macで変更（後）");
  });

  it("ほかのユーザーの記録は届かない", async () => {
    const alice = createDevice({ "2026-10-23": { items: [item("x", "Aliceの記録")] } });
    const bob = createDevice();
    await alice.signUp(uniqueName(), "password123");
    await bob.signUp(uniqueName(), "password123");
    expect(bob.logs).toEqual({});
  });

  it("オフライン中の変更は残しておき、つながったら送る", async () => {
    const name = uniqueName();
    const phone = createDevice();
    await phone.signUp(name, "password123");
    const realEndpoint = backend.syncUrl;
    phone.engine = createSyncEngine({
      getLogs: () => phone.logs,
      applyLogs: (next) => (phone.logs = next),
      getAccessToken: () => phone.auth.getAccessToken(),
      endpoint: "http://127.0.0.1:1/", // つながらない
      storage: { getItem: (k) => phone.storage.get(k) ?? null, setItem: (k, v) => phone.storage.set(k, v) },
    });
    phone.edit({ "2026-10-24": { items: [item("x", "電車の中で記録")] } });
    await phone.engine.sync();
    expect(phone.engine.getSnapshot()).toMatchObject({ error: "offline", pendingCount: 1 });

    phone.engine = createSyncEngine({
      getLogs: () => phone.logs,
      applyLogs: (next) => (phone.logs = next),
      getAccessToken: () => phone.auth.getAccessToken(),
      endpoint: realEndpoint,
      storage: { getItem: (k) => phone.storage.get(k) ?? null, setItem: (k, v) => phone.storage.set(k, v) },
    });
    await phone.engine.sync();
    expect(phone.engine.getSnapshot()).toMatchObject({ error: null, pendingCount: 0 });

    const mac = createDevice();
    await mac.signIn(name, "password123");
    expect(mac.logs["2026-10-24"].items[0].title).toBe("電車の中で記録");
  });

  it("通信中にまた変更しても、その変更は消えずに続けて送られる", async () => {
    const name = uniqueName();
    const phone = createDevice();
    await phone.signUp(name, "password123");
    phone.edit({ "2026-10-24": { items: [item("x", "1回目")] } });

    const realFetch = globalThis.fetch;
    let first = true;
    globalThis.fetch = async (...args) => {
      if (first && String(args[0]) === backend.syncUrl) {
        first = false;
        phone.edit({ "2026-10-24": { items: [item("x", "2回目")] } }); // 送信中に編集
      }
      return realFetch(...args);
    };
    try {
      await phone.engine.sync();
    } finally {
      globalThis.fetch = realFetch;
    }
    const mac = createDevice();
    await mac.signIn(name, "password123");
    expect(mac.logs["2026-10-24"].items[0].title).toBe("2回目");
  });

  it("記録が多くても（500 件）分けて送り、すべて届く", async () => {
    const name = uniqueName();
    const many = { "2026-10-01": { items: Array.from({ length: 500 }, (_, i) => item(`m${i}`, `T${i}`, i)) } };
    const phone = createDevice(many);
    await phone.signUp(name, "password123");
    expect(phone.engine.getSnapshot().pendingCount).toBe(0);
    const mac = createDevice();
    await mac.signIn(name, "password123");
    expect(mac.logs["2026-10-01"].items).toHaveLength(500);
  });

  it("サーバーにトークンを拒否されたら「再ログインが必要」になる", async () => {
    const phone = createDevice();
    await phone.signUp(uniqueName(), "password123");
    const saved = JSON.parse(phone.storage.get(AUTH_STORAGE_KEY));
    phone.storage.set(AUTH_STORAGE_KEY, JSON.stringify({ ...saved, accessToken: "bad.token.value", accessTokenExpiresAt: Date.now() + 3600e3 }));
    const reloaded = createDevice();
    reloaded.storage.set(AUTH_STORAGE_KEY, phone.storage.get(AUTH_STORAGE_KEY));
    reloaded.storage.set("studyReminderSync", phone.storage.get("studyReminderSync"));
    reloaded.auth = createAuthSession({
      cognito: createCognitoClient({ clientId: backend.cognito.clientId, endpoint: backend.cognito.url }),
      storage: { getItem: (k) => reloaded.storage.get(k) ?? null, setItem: (k, v) => reloaded.storage.set(k, v), removeItem: (k) => reloaded.storage.delete(k) },
    });
    reloaded.engine = createSyncEngine({
      getLogs: () => reloaded.logs,
      applyLogs: (next) => (reloaded.logs = next),
      getAccessToken: () => reloaded.auth.getAccessToken(),
      onUnauthorized: () => reloaded.auth.markExpired(),
      endpoint: backend.syncUrl,
      storage: { getItem: (k) => reloaded.storage.get(k) ?? null, setItem: (k, v) => reloaded.storage.set(k, v) },
    });
    await reloaded.engine.sync();
    expect(reloaded.engine.getSnapshot().error).toBe("sessionExpired");
    expect(reloaded.auth.getSnapshot()).toMatchObject({ loggedIn: false, expired: true });
  });
});
