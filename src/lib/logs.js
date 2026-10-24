// 学習記録データの形（旧バージョンと同じ。互換性のため変えないこと）
//
// {
//   "YYYY-MM-DD": {
//     items: [ { id, title, body, createdAt, updatedAt }, ... ]  // 新しい順
//   }
// }
//
// ここの関数は元のデータを書き換えず、新しいオブジェクトを返す。

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** その日の記録一覧（なければ空配列） */
export function getItems(logs, dateKey) {
  return logs[dateKey]?.items ?? [];
}

/** その日に記録があるか */
export function hasItems(logs, dateKey) {
  return getItems(logs, dateKey).length > 0;
}

/**
 * 記録を追加または更新する。
 * entry.id が既存の記録と一致すれば更新、なければ先頭に新規追加。
 */
export function upsertEntry(logs, dateKey, { id, title, body }, now = Date.now()) {
  const items = getItems(logs, dateKey);
  const exists = id && items.some((item) => item.id === id);

  const nextItems = exists
    ? items.map((item) => (item.id === id ? { ...item, title, body, updatedAt: now } : item))
    : [{ id: crypto.randomUUID(), title, body, createdAt: now, updatedAt: now }, ...items];

  return { ...logs, [dateKey]: { ...logs[dateKey], items: nextItems } };
}

/** 記録を削除する。その日の記録が空になったら日付ごと消す。 */
export function removeEntry(logs, dateKey, id) {
  const nextItems = getItems(logs, dateKey).filter((item) => item.id !== id);
  const { [dateKey]: _removed, ...rest } = logs;
  return nextItems.length ? { ...rest, [dateKey]: { ...logs[dateKey], items: nextItems } } : rest;
}

/** 読み込んだデータが記録データの形になっているか確認する。問題があればエラーメッセージを返す。 */
export function validateLogs(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return "データ構造が不正です";

  for (const [dateKey, day] of Object.entries(data)) {
    if (!DATE_KEY_PATTERN.test(dateKey)) return `日付キーが不正です（${dateKey}）`;
    if (!Array.isArray(day?.items)) return `items 配列が見つかりません（${dateKey}）`;
  }
  return null;
}
