// JSON バックアップのエクスポート / インポート。
// ファイル形式は旧バージョンと同じなので、以前のバックアップもそのまま読み込める。

import { validateLogs } from "./logs.js";
import { STORAGE_KEY } from "./storage.js";
import { todayKey } from "./dates.js";

/** バックアップファイルの中身を作る */
export function createBackup(logs, now = new Date()) {
  return {
    app: "StudyLog",
    version: 1,
    exportedAt: now.toISOString(),
    storageKey: STORAGE_KEY,
    data: logs,
  };
}

/** バックアップファイルの中身から記録データを取り出す。不正ならエラーを投げる。 */
export function parseBackup(text) {
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error("JSON形式が不正です");
  }
  if (!payload?.data) throw new Error("data が見つかりません");

  const error = validateLogs(payload.data);
  if (error) throw new Error(error);
  return payload.data;
}

/** バックアップを .json ファイルとしてダウンロードさせる */
export function downloadBackup(logs) {
  const json = JSON.stringify(createBackup(logs), null, 2);
  const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));

  const link = document.createElement("a");
  link.href = url;
  link.download = `study-log-backup-${todayKey()}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  // Safari ではすぐに解放するとダウンロードが失敗することがあるため、少し待つ
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** 選ばれたファイルを読み込んで記録データを返す */
export async function readBackupFile(file) {
  return parseBackup(await file.text());
}
