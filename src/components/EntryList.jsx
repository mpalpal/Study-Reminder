import { REVIEW_STAGES } from "../lib/reviews.js";
import { useI18n } from "../i18n/I18nProvider.jsx";
import ReviewBadges from "./ReviewBadges.jsx";

/**
 * 編集用の記録一覧。タイトルをタップで編集、「削除」で削除。
 * showReviews を付けると、各タイミングの復習チェック状況も表示する。
 */
export default function EntryList({ items, onSelect, onDelete, showReviews = false }) {
  const { t } = useI18n();
  if (items.length === 0) return <div className="muted box">{t("common.empty")}</div>;

  return (
    <ul className="list">
      {items.map((item) => (
        <li key={item.id} className="list-row">
          <button type="button" className="list-btn" onClick={() => onSelect(item)}>
            <span className="list-btn-title">{item.title || t("common.untitled")}</span>
            {showReviews && <ReviewBadges item={item} stages={REVIEW_STAGES} />}
          </button>
          <button type="button" className="danger" onClick={() => onDelete(item)}>
            {t("common.delete")}
          </button>
        </li>
      ))}
    </ul>
  );
}
