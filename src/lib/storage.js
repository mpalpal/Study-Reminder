// 端末のブラウザ(localStorage)への保存。キー名は旧バージョンと同じものを使う。

export const STORAGE_KEY = "studyLogsV2";

export function loadLogs() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function saveLogs(logs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
}
