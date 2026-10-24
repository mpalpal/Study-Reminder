import { isReviewed } from "../lib/reviews.js";
import { useI18n } from "../i18n/I18nProvider.jsx";

/** 各復習タイミングのチェック状況を小さく並べる。例：「昨日 ✓」「1週間前 −」 */
export default function ReviewBadges({ item, stages }) {
  const { t } = useI18n();
  if (stages.length === 0) return null;

  return (
    <span className="review-badges">
      {stages.map(({ days }) => {
        const done = isReviewed(item, days);
        return (
          <span key={days} className={done ? "review-badge done" : "review-badge"}>
            {t(`stage.${days}`)} {done ? "✓" : "−"}
            <span className="visually-hidden">{t(done ? "review.reviewed" : "review.notReviewed")}</span>
          </span>
        );
      })}
    </span>
  );
}
