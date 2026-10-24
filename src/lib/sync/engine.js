// 同期の本体。画面（React）からは独立していて、テストでは fetch と保存先を差し替えられる。
//
// しくみ
// - 記録を変更するたびに recordChanges() で「未送信の変更」(pending) に id と変更時刻を控える。
// - sync() で未送信の変更をサーバーに送り、同時に前回以降のほかの端末の変更を受け取る。
// - 同じ記録が両方で変更されていたら、変更時刻が新しい方を残す（サーバー側で判定）。
// - 削除も「削除した」という変更として送るので、ほかの端末からも消える。

import { applyRemoteChanges, changedIds, indexItems } from "./changes.js";
import { decryptJson, deriveSyncSecrets, encryptJson, generateSyncKey, normalizeSyncKey } from "./syncKey.js";

export const SYNC_STORAGE_KEY = "studyReminderSync";
const EMPTY_STATE = { syncKey: null, cursor: 0, pending: {}, lastSyncedAt: null };

/** 同期の失敗。code は文言辞書の "sync.error.〇〇" に対応 */
export class SyncError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

const STATUS_CODES = { 401: "unauthorized", 404: "notFound", 409: "server", 413: "tooLarge", 503: "notConfigured" };

/**
 * getLogs: 今の記録データを返す関数
 * applyLogs: ほかの端末の変更を取り込んだ記録データを保存・表示する関数（未送信の変更には数えない）
 */
export function createSyncEngine({
  getLogs,
  applyLogs,
  storage = globalThis.localStorage,
  fetch = (...args) => globalThis.fetch(...args),
  now = Date.now,
  endpoint = "/api/sync",
}) {
  let state = load();
  let secrets = null; // 同期キーから作った認証トークンと暗号鍵（必要になったときに作る）
  let running = null; // 実行中の同期
  let runAgain = false; // 実行中に新しい変更があった
  let starting = false; // 同期を始める途中（最初の送受信が成功するまでは「同期中」扱いにしない）
  let status = { syncing: false, error: null };
  let snapshot = makeSnapshot();
  const listeners = new Set();

  function load() {
    try {
      return { ...EMPTY_STATE, ...JSON.parse(storage.getItem(SYNC_STORAGE_KEY) ?? "{}") };
    } catch {
      return { ...EMPTY_STATE };
    }
  }

  function save() {
    storage.setItem(SYNC_STORAGE_KEY, JSON.stringify(state));
    notify();
  }

  function makeSnapshot() {
    return {
      enabled: Boolean(state.syncKey) && !starting,
      syncKey: state.syncKey,
      lastSyncedAt: state.lastSyncedAt,
      pendingCount: Object.keys(state.pending).length,
      ...status,
    };
  }

  function notify() {
    snapshot = makeSnapshot();
    listeners.forEach((listener) => listener());
  }

  function setStatus(changes) {
    status = { ...status, ...changes };
    notify();
  }

  /** 今ある記録をすべて「未送信」にする（同期を始めるとき用） */
  function markAllPending(version) {
    const pending = {};
    for (const [id, { item }] of indexItems(getLogs())) pending[id] = version ?? item.updatedAt ?? 0;
    return pending;
  }

  /** 1 回分の送受信 */
  async function exchange({ create = false } = {}) {
    const syncKey = state.syncKey;
    secrets ??= await deriveSyncSecrets(syncKey);
    const { authToken, cryptoKey } = secrets;

    const sent = { ...state.pending };
    const index = indexItems(getLogs());
    const changes = await Promise.all(
      Object.entries(sent).map(async ([id, version]) => {
        const entry = index.get(id);
        return entry
          ? { id, version, deleted: false, payload: await encryptJson(cryptoKey, entry) }
          : { id, version, deleted: true, payload: null };
      }),
    );

    let response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ create, since: state.cursor, changes }),
      });
    } catch {
      throw new SyncError("offline");
    }
    if (!response.ok) throw new SyncError(STATUS_CODES[response.status] ?? "server");
    const result = await response.json();

    // 通信中に同期が解除・切り替えされていたら、結果は捨てる
    if (state.syncKey !== syncKey) return;

    const remote = [];
    for (const row of result.changes) {
      const sentVersion = sent[row.id];
      if (state.pending[row.id] !== sentVersion) continue; // 通信中にこの端末でまた変更された → 次回送る
      if (sentVersion === row.version) continue; // 自分が送った内容そのもの
      if (row.deleted) {
        remote.push({ id: row.id, deleted: true });
        continue;
      }
      try {
        const { dateKey, item } = await decryptJson(cryptoKey, row.payload);
        remote.push({ id: row.id, dateKey, item });
      } catch {
        // 読めないデータは無視する（壊れている場合）
      }
    }

    const pending = { ...state.pending };
    for (const [id, version] of Object.entries(sent)) if (pending[id] === version) delete pending[id];
    state = { ...state, pending, cursor: result.cursor, lastSyncedAt: now() };
    save();

    if (remote.length) applyLogs(applyRemoteChanges(getLogs(), remote));
  }

  async function runSync() {
    setStatus({ syncing: true });
    try {
      // 通信中に新しい変更があれば続けて送る（念のため回数に上限を設ける）
      for (let round = 0; round < 5; round++) {
        runAgain = false;
        await exchange();
        if (!state.syncKey || (!runAgain && Object.keys(state.pending).length === 0)) break;
      }
      setStatus({ syncing: false, error: null });
    } catch (err) {
      setStatus({ syncing: false, error: err.code ?? "server" });
    } finally {
      running = null;
    }
  }

  /** 新しい同期キーで同期を始める。問題があれば元に戻して SyncError を投げる */
  async function start(syncKey, { create }) {
    if (running) await running;
    const previous = state;
    state = { ...EMPTY_STATE, syncKey, pending: markAllPending(create ? now() : undefined) };
    secrets = null;
    starting = true;
    setStatus({ syncing: true, error: null });
    try {
      await exchange({ create });
    } catch (err) {
      state = previous;
      secrets = null;
      save();
      throw err;
    } finally {
      starting = false;
      setStatus({ syncing: false });
    }
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => snapshot,

    /** ローカルで記録が変わったときに呼ぶ */
    recordChanges(prev, next) {
      if (!state.syncKey) return;
      const ids = changedIds(prev, next);
      if (!ids.length) return;
      const time = now();
      const pending = { ...state.pending };
      for (const id of ids) pending[id] = Math.max(time, (pending[id] ?? 0) + 1);
      state = { ...state, pending };
      save();
    },

    /** 同期する。実行中なら終わったあとにもう一度だけ行う */
    sync() {
      if (!state.syncKey || starting) return Promise.resolve();
      if (running) {
        runAgain = true;
        return running;
      }
      running = runSync();
      return running;
    },

    /** 新しい同期キーを作って同期を始める。作ったキーを返す */
    async create() {
      const syncKey = generateSyncKey();
      await start(syncKey, { create: true });
      return syncKey;
    },

    /** 入力された同期キーでつなぐ */
    async connect(input) {
      const syncKey = normalizeSyncKey(input);
      if (!syncKey) throw new SyncError("invalidKey");
      await start(syncKey, { create: false });
    },

    /** この端末の同期を解除する（記録は残る） */
    disconnect() {
      state = { ...EMPTY_STATE };
      secrets = null;
      status = { syncing: false, error: null };
      save();
    },
  };
}
