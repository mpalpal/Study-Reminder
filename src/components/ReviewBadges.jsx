import { isReviewed } from "../lib/reviews.js";

/** 各復習タイミングのチェック状況を小さく並べる。例：「昨日 ✓」「1週間前 −」 */
export default function ReviewBadges({ item, stages }) {
  if (stages.length === 0) return null;

  return (
    <span className="review-badges">
      {stages.map(({ days, name }) => {
        const done = isReviewed(item, days);
        return (
          <span key={days} className={done ? "review-badge done" : "review-badge"}>
            {name} {done ? "✓" : "−"}
            <span className="visually-hidden">{done ? "（復習済み）" : "（未復習）"}</span>
          </span>
        );
      })}
    </span>
  );
}
