// 復習タイミング（記録した日から何日後に復習するか）と、チェック状態の読み取り。

export const REVIEW_STAGES = [
  { days: 1, name: "昨日" },
  { days: 7, name: "1週間前" },
  { days: 14, name: "2週間前" },
];

/** その記録が、そのタイミングで復習済みか */
export function isReviewed(item, days) {
  return Boolean(item.reviews?.[days]);
}

/** days より前の復習タイミング（例：14 → 昨日・1週間前） */
export function stagesBefore(days) {
  return REVIEW_STAGES.filter((stage) => stage.days < days);
}

/** 復習ページの見出し。例：「昨日（2026-10-23）」「2026-10-04（20日前）」 */
export function reviewLabel(daysAgo, dateKey) {
  const name = daysAgo === 0 ? "今日" : REVIEW_STAGES.find((stage) => stage.days === daysAgo)?.name;
  return name ? `${name}（${dateKey}）` : `${dateKey}（${daysAgo}日前）`;
}
