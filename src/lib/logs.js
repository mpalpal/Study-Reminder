// 学習記録データの形（旧バージョンと同じ。互換性のため変えないこと）
//
// {
//   "YYYY-MM-DD": {
//     items: [ { id, title, body, createdAt, updatedAt, reviews? }, ... ]  // 新しい順
//   }
// }
//
// reviews（復習チェック・後から追加した項目）: { "1": チェックした時刻, "7": ..., "14": ... }
//   キーは復習タイミング（何日前に出てきたときか）。項目がない古いデータは「未チェック」として扱う。
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

  if (exists) return updateItem(logs, dateKey, id, (item) => ({ ...item, title, body, updatedAt: now }));

  const newItem = { id: crypto.randomUUID(), title, body, createdAt: now, updatedAt: now };
  return { ...logs, [dateKey]: { ...logs[dateKey], items: [newItem, ...items] } };
}

/** 記録の復習チェックを付ける / 外す。stage は復習タイミング（1, 7, 14） */
export function setReviewed(logs, dateKey, id, stage, checked, now = Date.now()) {
  return updateItem(logs, dateKey, id, ({ reviews = {}, ...item }) => {
    const { [stage]: _old, ...others } = reviews;
    const next = checked ? { ...others, [stage]: now } : others;
    return Object.keys(next).length ? { ...item, reviews: next } : item;
  });
}

/** 指定した記録だけを update 関数で置き換える */
function updateItem(logs, dateKey, id, update) {
  const items = getItems(logs, dateKey).map((item) => (item.id === id ? update(item) : item));
  return { ...logs, [dateKey]: { ...logs[dateKey], items } };
}

/** 記録を削除する。その日の記録が空になったら日付ごと消す。 */
export function removeEntry(logs, dateKey, id) {
  const nextItems = getItems(logs, dateKey).filter((item) => item.id !== id);
  const { [dateKey]: _removed, ...rest } = logs;
  return nextItems.length ? { ...rest, [dateKey]: { ...logs[dateKey], items: nextItems } } : rest;
}

/**
 * 読み込んだデータが記録データの形になっているか確認する。
 * 問題があれば { code, dateKey }（code は文言辞書の "backupError.〇〇" に対応）、なければ null。
 */
export function validateLogs(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return { code: "badStructure" };

  for (const [dateKey, day] of Object.entries(data)) {
    if (!DATE_KEY_PATTERN.test(dateKey)) return { code: "badDateKey", dateKey };
    if (!Array.isArray(day?.items)) return { code: "noItems", dateKey };
  }
  return null;
}
