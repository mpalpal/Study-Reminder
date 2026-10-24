import { describe, expect, it } from "vitest";
import { applyRemoteChanges, changedIds } from "./changes.js";
import { createSyncEngine, SYNC_STORAGE_KEY } from "./engine.js";
import { decryptJson, deriveSyncSecrets, encryptJson, formatSyncKey, generateSyncKey, normalizeSyncKey } from "./syncKey.js";

const item = (id, title, createdAt = 1, extra = {}) => ({ id, title, body: "b", createdAt, updatedAt: createdAt, ...extra });

describe("同期キー", () => {
  it("24 文字で、表示用に区切れて、入力の揺れを吸収する", () => {
    const key = generateSyncKey();
    expect(key).toMatch(/^[0-9A-HJKMNP-TV-Z]{24}$/);
    const shown = formatSyncKey(key);
    expect(shown.split("-")).toHaveLength(6);
    expect(normalizeSyncKey(` ${shown.toLowerCase()} `)).toBe(key);
    expect(normalizeSyncKey("O0IL".repeat(6))).toBe("0011".repeat(6));
    expect(normalizeSyncKey("short")).toBeNull();
  });

  it("同じキーからは同じトークン、暗号化したものは同じキーでだけ戻せる", async () => {
    const key = generateSyncKey();
    const a = await deriveSyncSecrets(key);
    const b = await deriveSyncSecrets(key);
    expect(a.authToken).toMatch(/^[0-9a-f]{64}$/);
    expect(a.authToken).toBe(b.authToken);

    const value = { dateKey: "2026-10-24", item: item("x", "日本語のタイトル") };
    const payload = await encryptJson(a.cryptoKey, value);
    expect(payload).not.toContain("日本語");
    expect(await decryptJson(b.cryptoKey, payload)).toEqual(value);

    const other = await deriveSyncSecrets(generateSyncKey());
    await expect(decryptJson(other.cryptoKey, payload)).rejects.toThrow();
  });
});

describe("差分と取り込み", () => {
  const logs = { "2026-10-24": { items: [item("a", "A", 2), item("b", "B", 1)] } };

  it("追加・変更・削除された id を返す", () => {
    const next = {
      "2026-10-24": { items: [item("c", "C", 3), { ...item("a", "A", 2), reviews: { 1: 5 } }] },
    };
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

  it("最後の 1 件が消えたら日付ごと消える", () => {
    expect(applyRemoteChanges({ "2026-10-24": { items: [item("a", "A")] } }, [{ id: "a", deleted: true }])).toEqual({});
  });
});

// ---- サーバーの代わり（functions/api/sync.js と同じ規則で動く） ----
function createFakeServer() {
  const spaces = new Map(); // spaceId → { seq, items: Map }
  let online = true;
  const server = {
    setOnline: (value) => (online = value),
    spaces,
    async fetch(url, { headers, body }) {
      if (!online) throw new TypeError("Failed to fetch");
      const token = headers.Authorization.slice("Bearer ".length);
      const req = JSON.parse(body);
      const reply = (status, json) => ({ ok: status === 200, status, json: async () => json });
      if (req.create) {
        if (spaces.has(token)) return reply(409, { error: "exists" });
        spaces.set(token, { seq: 0, items: new Map() });
      }
      const space = spaces.get(token);
      if (!space) return reply(404, { error: "notFound" });
      if (req.changes.length) {
        space.seq += 1;
        for (const c of req.changes) {
          const current = space.items.get(c.id);
          if (!current || c.version > current.version) space.items.set(c.id, { ...c, seq: space.seq });
        }
      }
      const ids = new Set(req.changes.map((c) => c.id));
      const changes = [...space.items.values()]
        .filter((row) => row.seq > req.since || ids.has(row.id))
        .map(({ id, version, deleted, payload }) => ({ id, version, deleted, payload }));
      return reply(200, { cursor: space.seq, changes });
    },
  };
  return server;
}

/** 1 台の端末（記録データ + 同期エンジン）を再現する */
function createDevice(server, initialLogs = {}, clock = { t: 1000 }) {
  const store = new Map();
  const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  const device = { logs: initialLogs };
  device.engine = createSyncEngine({
    getLogs: () => device.logs,
    applyLogs: (next) => (device.logs = next),
    storage,
    fetch: (...args) => server.fetch(...args),
    now: () => (clock.t += 1),
  });
  device.edit = (next) => {
    device.engine.recordChanges(device.logs, next);
    device.logs = next;
  };
  device.storage = store;
  return device;
}

describe("同期エンジン（2 台の端末）", () => {
  it("新しく始めて、別の端末でつなぎ、変更と削除が行き来する", async () => {
    const server = createFakeServer();
    const clock = { t: 1000 };
    const phone = createDevice(server, { "2026-10-23": { items: [item("a", "A")] } }, clock);
    const mac = createDevice(server, {}, clock);

    const key = await phone.engine.create();
    expect(phone.engine.getSnapshot()).toMatchObject({ enabled: true, pendingCount: 0, error: null });

    await mac.engine.connect(formatSyncKey(key).toLowerCase());
    expect(mac.logs["2026-10-23"].items[0].title).toBe("A");

    // Mac で追加 → iPhone に届く
    mac.edit({ ...mac.logs, "2026-10-24": { items: [item("b", "B", 5)] } });
    await mac.engine.sync();
    await phone.engine.sync();
    expect(phone.logs["2026-10-24"].items[0].title).toBe("B");

    // iPhone で復習チェック → Mac に届く
    const checked = { ...phone.logs, "2026-10-23": { items: [{ ...item("a", "A"), reviews: { 1: 9 } }] } };
    phone.edit(checked);
    await phone.engine.sync();
    await mac.engine.sync();
    expect(mac.logs["2026-10-23"].items[0].reviews).toEqual({ 1: 9 });

    // iPhone で削除 → Mac からも消える
    const { "2026-10-24": _gone, ...withoutB } = phone.logs;
    phone.edit(withoutB);
    await phone.engine.sync();
    await mac.engine.sync();
    expect(mac.logs["2026-10-24"]).toBeUndefined();
  });

  it("同じ記録を両方で変えたら、あとから変えた方が残る", async () => {
    const server = createFakeServer();
    const clock = { t: 1000 };
    const phone = createDevice(server, { "2026-10-23": { items: [item("a", "A")] } }, clock);
    const mac = createDevice(server, {}, clock);
    const key = await phone.engine.create();
    await mac.engine.connect(key);

    phone.edit({ "2026-10-23": { items: [item("a", "iPhoneで変更")] } });
    mac.edit({ "2026-10-23": { items: [item("a", "Macで変更（後）")] } });
    await phone.engine.sync();
    await mac.engine.sync(); // Mac の方が新しいので勝つ
    await phone.engine.sync();
    expect(phone.logs["2026-10-23"].items[0].title).toBe("Macで変更（後）");
    expect(mac.logs["2026-10-23"].items[0].title).toBe("Macで変更（後）");
  });

  it("存在しない同期キーではつながらず、元の状態に戻る", async () => {
    const server = createFakeServer();
    const device = createDevice(server, { "2026-10-23": { items: [item("a", "A")] } });
    await expect(device.engine.connect(generateSyncKey())).rejects.toMatchObject({ code: "notFound" });
    await expect(device.engine.connect("123")).rejects.toMatchObject({ code: "invalidKey" });
    expect(device.engine.getSnapshot().enabled).toBe(false);
  });

  it("オフライン中の変更は残しておき、つながったら送る", async () => {
    const server = createFakeServer();
    const clock = { t: 1000 };
    const phone = createDevice(server, {}, clock);
    const mac = createDevice(server, {}, clock);
    const key = await phone.engine.create();
    await mac.engine.connect(key);

    server.setOnline(false);
    phone.edit({ "2026-10-24": { items: [item("x", "電車の中で記録")] } });
    await phone.engine.sync();
    expect(phone.engine.getSnapshot()).toMatchObject({ error: "offline", pendingCount: 1 });

    server.setOnline(true);
    await phone.engine.sync();
    expect(phone.engine.getSnapshot()).toMatchObject({ error: null, pendingCount: 0 });
    await mac.engine.sync();
    expect(mac.logs["2026-10-24"].items[0].title).toBe("電車の中で記録");
  });

  it("通信中にまた変更しても、その変更は消えずに次回送られる", async () => {
    const server = createFakeServer();
    const clock = { t: 1000 };
    const phone = createDevice(server, {}, clock);
    await phone.engine.create();

    phone.edit({ "2026-10-24": { items: [item("x", "1回目")] } });
    const originalFetch = server.fetch;
    server.fetch = async (...args) => {
      phone.edit({ "2026-10-24": { items: [item("x", "2回目")] } }); // 送信中に編集
      server.fetch = originalFetch;
      return originalFetch(...args);
    };
    await phone.engine.sync();
    expect(phone.logs["2026-10-24"].items[0].title).toBe("2回目");

    const mac = createDevice(server, {}, clock);
    const key = phone.engine.getSnapshot().syncKey;
    await mac.engine.connect(key);
    expect(mac.logs["2026-10-24"].items[0].title).toBe("2回目");
  });

  it("サーバーには暗号化された中身しか届かない", async () => {
    const server = createFakeServer();
    const phone = createDevice(server, { "2026-10-23": { items: [item("a", "秘密のメモ")] } });
    await phone.engine.create();
    const stored = JSON.stringify([...server.spaces.values()].map((s) => [...s.items.values()]));
    expect(stored).not.toContain("秘密のメモ");
    expect(JSON.parse(phone.storage.get(SYNC_STORAGE_KEY)).syncKey).toHaveLength(24);
  });

  it("解除すると同期キーを忘れるが、記録は残る", async () => {
    const server = createFakeServer();
    const phone = createDevice(server, { "2026-10-23": { items: [item("a", "A")] } });
    await phone.engine.create();
    phone.engine.disconnect();
    expect(phone.engine.getSnapshot()).toMatchObject({ enabled: false, syncKey: null });
    expect(phone.logs["2026-10-23"].items).toHaveLength(1);
  });
});
