// 記録データの「差分」と「取り込み」。同期は記録 1 件（id）単位で行う。

/** id → { dateKey, item } の一覧を作る */
export function indexItems(logs) {
  const index = new Map();
  for (const [dateKey, day] of Object.entries(logs)) {
    for (const item of day.items ?? []) index.set(item.id, { dateKey, item });
  }
  return index;
}

/** prev と next で追加・変更・削除された記録の id */
export function changedIds(prev, next) {
  const before = indexItems(prev);
  const after = indexItems(next);
  const ids = [];
  for (const [id, entry] of after) {
    const old = before.get(id);
    if (!old || old.dateKey !== entry.dateKey || JSON.stringify(old.item) !== JSON.stringify(entry.item)) ids.push(id);
  }
  for (const id of before.keys()) if (!after.has(id)) ids.push(id);
  return ids;
}

/**
 * ほかの端末からの変更を取り込む。
 * changes: [{ id, deleted: true }] または [{ id, dateKey, item }]
 */
export function applyRemoteChanges(logs, changes) {
  const ids = new Set(changes.map((change) => change.id));
  const next = {};

  // いったん対象の記録を全部取り除く（日付が変わっていても対応できるように）
  for (const [dateKey, day] of Object.entries(logs)) {
    const items = day.items.filter((item) => !ids.has(item.id));
    if (items.length) next[dateKey] = { ...day, items };
  }

  const touched = new Set();
  for (const change of changes) {
    if (change.deleted) continue;
    const day = next[change.dateKey] ?? { items: [] };
    next[change.dateKey] = { ...day, items: [...day.items, { ...change.item, id: change.id }] };
    touched.add(change.dateKey);
  }

  // 追加した日付は新しい順に並べ直す
  for (const dateKey of touched) {
    next[dateKey].items.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  }
  return next;
}
