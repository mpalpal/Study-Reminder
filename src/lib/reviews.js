// 復習タイミング（記録した日から何日後に復習するか）と、チェック状態の読み取り。

// 表示名は文言辞書の "stage.1" などにある
export const REVIEW_STAGES = [{ days: 1 }, { days: 7 }, { days: 14 }];

/** その記録が、そのタイミングで復習済みか */
export function isReviewed(item, days) {
  return Boolean(item.reviews?.[days]);
}

/** days より前の復習タイミング（例：14 → 昨日・1週間前） */
export function stagesBefore(days) {
  return REVIEW_STAGES.filter((stage) => stage.days < days);
}

/** 復習ページの見出し。例：「昨日（2026-10-23）」「2026-10-04（20日前）」（t は翻訳関数） */
export function reviewLabel(t, daysAgo, dateKey) {
  const isStage = REVIEW_STAGES.some((stage) => stage.days === daysAgo);
  const name = daysAgo === 0 ? t("day.today") : isStage ? t(`stage.${daysAgo}`) : null;
  return name ? t("review.headingNamed", { name, date: dateKey }) : t("review.headingDaysAgo", { date: dateKey, n: daysAgo });
}
