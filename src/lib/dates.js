// 日付は "YYYY-MM-DD" 形式の文字列（日付キー）で扱う。
// Date を作るときは正午(12時)にしておくと、夏時間などで日付がずれない。

const pad2 = (n) => String(n).padStart(2, "0");

/** Date → "YYYY-MM-DD"（端末のローカル日付） */
export function toDateKey(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** 今日の日付キー */
export function todayKey() {
  return toDateKey(new Date());
}

/** 日付キーを days 日ずらす（負の数で過去へ） */
export function shiftDateKey(dateKey, days) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return toDateKey(new Date(y, m - 1, d + days, 12));
}

/** 次の 0 時までのミリ秒 */
export function msUntilMidnight(now = new Date()) {
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return midnight - now;
}

/** 復習ページの見出し。例：「昨日（2026-10-23）」「2026-10-04（20日前）」 */
export function reviewLabel(daysAgo, dateKey) {
  const names = { 0: "今日", 1: "昨日", 7: "1週間前", 14: "2週間前" };
  return names[daysAgo] ? `${names[daysAgo]}（${dateKey}）` : `${dateKey}（${daysAgo}日前）`;
}

/** 年月の表示。例：「2026-10」（month は 0 始まり） */
export function monthLabel(year, month) {
  return `${year}-${pad2(month + 1)}`;
}

/** 日付キーが属する年月 { year, month }（month は 0 始まり） */
export function monthOf(dateKey) {
  const [y, m] = dateKey.split("-").map(Number);
  return { year: y, month: m - 1 };
}

/** 年月 { year, month } を delta か月ずらす */
export function addMonths({ year, month }, delta) {
  const date = new Date(year, month + delta, 1, 12);
  return { year: date.getFullYear(), month: date.getMonth() };
}

/**
 * カレンダー1か月分のマス目。
 * 前月末・翌月頭も含めて、日曜始まりで 7 の倍数になるように並べる。
 */
export function calendarDays(year, month) {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cellCount = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

  return Array.from({ length: cellCount }, (_, i) => {
    const date = new Date(year, month, 1 - firstWeekday + i, 12);
    return {
      dateKey: toDateKey(date),
      day: date.getDate(),
      inMonth: date.getMonth() === month,
    };
  });
}
