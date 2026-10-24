import { useState } from "react";
import { loadLogs, saveLogs } from "../lib/storage.js";
import { removeEntry, setReviewed, upsertEntry } from "../lib/logs.js";

/**
 * 学習記録データと、その変更操作をまとめたもの。
 * 変更するたびに localStorage へ保存し、画面も自動で更新される。
 */
export function useStudyLogs() {
  const [logs, setLogs] = useState(loadLogs);

  const commit = (next) => {
    saveLogs(next);
    setLogs(next);
  };

  return {
    logs,
    saveEntry: (dateKey, entry) => commit(upsertEntry(logs, dateKey, entry)),
    deleteEntry: (dateKey, id) => commit(removeEntry(logs, dateKey, id)),
    setReviewed: (dateKey, id, stage, checked) => commit(setReviewed(logs, dateKey, id, stage, checked)),
    replaceAll: (data) => commit(data),
    clearAll: () => commit({}),
  };
}
