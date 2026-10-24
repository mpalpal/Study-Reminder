import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { loadLogs, saveLogs } from "../lib/storage.js";
import { removeEntry, setReviewed, upsertEntry } from "../lib/logs.js";
import { createSyncEngine } from "../lib/sync/engine.js";

const SYNC_DELAY_MS = 800; // 連続した操作（チェックを続けて付けるなど）をまとめて送るための待ち時間

/**
 * 学習記録データと、その変更操作をまとめたもの。
 * 変更するたびに localStorage へ保存し、画面も自動で更新される。
 * 同期を使っていれば、アプリを開いたとき・画面に戻ったとき・保存したときに自動で同期する。
 */
export function useStudyLogs() {
  const [logs, setLogs] = useState(loadLogs);
  const latest = useRef(logs); // 非同期の同期処理からも最新の記録を読めるように
  const syncTimer = useRef();

  const show = (next) => {
    latest.current = next;
    saveLogs(next);
    setLogs(next);
  };

  const [engine] = useState(() =>
    createSyncEngine({ getLogs: () => latest.current, applyLogs: (next) => show(next) }),
  );
  const syncStatus = useSyncExternalStore(engine.subscribe, engine.getSnapshot);

  const commit = (update) => {
    const next = update(latest.current);
    engine.recordChanges(latest.current, next);
    show(next);
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => engine.sync(), SYNC_DELAY_MS);
  };

  useEffect(() => {
    const syncIfVisible = () => document.visibilityState === "visible" && engine.sync();
    engine.sync(); // アプリを開いたとき
    document.addEventListener("visibilitychange", syncIfVisible); // ホーム画面から戻ったとき
    window.addEventListener("online", syncIfVisible); // 電波が戻ったとき
    return () => {
      document.removeEventListener("visibilitychange", syncIfVisible);
      window.removeEventListener("online", syncIfVisible);
      clearTimeout(syncTimer.current);
    };
  }, [engine]);

  return {
    logs,
    saveEntry: (dateKey, entry) => commit((cur) => upsertEntry(cur, dateKey, entry)),
    deleteEntry: (dateKey, id) => commit((cur) => removeEntry(cur, dateKey, id)),
    setReviewed: (dateKey, id, stage, checked) => commit((cur) => setReviewed(cur, dateKey, id, stage, checked)),
    replaceAll: (data) => commit(() => data),
    clearAll: () => commit(() => ({})),

    sync: {
      status: syncStatus,
      create: engine.create,
      connect: engine.connect,
      disconnect: engine.disconnect,
      syncNow: engine.sync,
    },
  };
}
