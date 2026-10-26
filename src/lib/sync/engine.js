// 同期の本体。画面（React）からは独立していて、テストでは fetch と保存先を差し替えられる。
//
// しくみ
// - ログインしている間、記録を変更するたびに recordChanges() で「未送信の変更」(pending) に
//   id と変更時刻を控える。
// - sync() で未送信の変更をサーバーに送り、同時に前回以降のほかの端末の変更を受け取る。
// - 同じ記録が両方で変更されていたら、変更時刻が新しい方を残す（サーバー側で判定）。
// - 削除も「削除した」という変更として送るので、ほかの端末からも消える。

import { applyRemoteChanges, changedIds, indexItems } from "./changes.js";

export const SYNC_STORAGE_KEY = "studyReminderSync";
const EMPTY_STATE = { active: false, cursor: 0, pending: {}, lastSyncedAt: null };
const BATCH_SIZE = 200; // 1 回の通信で送る件数（サーバーの上限と同じ）
const MAX_ROUNDS = 50; // 1 回の同期で続けて送る回数の上限（200 件 × 50 回 = 1 万件）

/** 同期の失敗。code は文言辞書の "account.error.〇〇" に対応 */
export class SyncError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

const STATUS_CODES = { 401: "sessionExpired", 413: "tooLarge" };

/**
 * getLogs: 今の記録データを返す関数
 * applyLogs: ほかの端末の変更を取り込んだ記録データを保存・表示する関数（未送信の変更には数えない）
 * getAccessToken: サーバーに送るトークンを返す関数（ログインしていなければ null）
 * onUnauthorized: サーバーにトークンを拒否されたときに呼ぶ関数
 */
export function createSyncEngine({
  getLogs,
  applyLogs,
  getAccessToken,
  onUnauthorized = () => {},
  endpoint,
  storage = globalThis.localStorage,
  fetch = (...args) => globalThis.fetch(...args),
  now = Date.now,
}) {
  let state = load();
  let running = null; // 実行中の同期
  let runAgain = false; // 実行中に新しい変更があった
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
      active: state.active,
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

  /** 1 回分の送受信（未送信の変更のうち最大 BATCH_SIZE 件） */
  async function exchange() {
    const generation = state;
    const token = await getAccessToken().catch((err) => {
      throw new SyncError(err.code === "network" ? "offline" : "server");
    });
    if (!token) throw new SyncError("sessionExpired");

    const sent = Object.fromEntries(Object.entries(state.pending).slice(0, BATCH_SIZE));
    const index = indexItems(getLogs());
    const changes = Object.entries(sent).map(([id, version]) => {
      const entry = index.get(id);
      return entry
        ? { id, version, deleted: false, payload: { dateKey: entry.dateKey, item: entry.item } }
        : { id, version, deleted: true, payload: null };
    });

    let response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ since: state.cursor, changes }),
      });
    } catch {
      throw new SyncError("offline");
    }
    if (response.status === 401) onUnauthorized();
    if (!response.ok) throw new SyncError(STATUS_CODES[response.status] ?? "server");
    const result = await response.json();

    // 通信中にログアウトされていたら、結果は捨てる
    if (!state.active || state.startedAt !== generation.startedAt) return;

    const remote = [];
    for (const row of result.changes) {
      const sentVersion = sent[row.id];
      if (state.pending[row.id] !== sentVersion) continue; // 通信中にこの端末でまた変更された → 次回送る
      if (sentVersion === row.version) continue; // 自分が送った内容そのもの
      remote.push(row.deleted ? { id: row.id, deleted: true } : { id: row.id, ...row.payload });
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
      // 未送信の変更が残っている・通信中に新しい変更があった間は続けて送る
      for (let round = 0; round < MAX_ROUNDS; round++) {
        runAgain = false;
        await exchange();
        if (!state.active || (!runAgain && Object.keys(state.pending).length === 0)) break;
      }
      setStatus({ syncing: false, error: null });
    } catch (err) {
      setStatus({ syncing: false, error: err.code ?? "server" });
    } finally {
      running = null;
    }
  }

  const engine = {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => snapshot,

    /** ローカルで記録が変わったときに呼ぶ */
    recordChanges(prev, next) {
      if (!state.active) return;
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
      if (!state.active) return Promise.resolve();
      if (running) {
        runAgain = true;
        return running;
      }
      running = runSync();
      return running;
    },

    /**
     * ログインした直後に呼ぶ。この端末にある記録をすべて送り、アカウントの記録を受け取る。
     * （サーバーに同じ記録があれば、新しい方が残る）
     */
    async start() {
      if (running) await running;
      const pending = {};
      for (const [id, { item }] of indexItems(getLogs())) pending[id] = item.updatedAt ?? 0;
      state = { ...EMPTY_STATE, active: true, startedAt: now(), pending };
      status = { syncing: false, error: null };
      save();
      return engine.sync();
    },

    /** ログアウトしたときに呼ぶ */
    stop() {
      state = { ...EMPTY_STATE };
      status = { syncing: false, error: null };
      save();
    },
  };
  return engine;
}
