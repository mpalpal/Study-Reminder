import { REVIEW_STAGES } from "../lib/reviews.js";
import ReviewBadges from "./ReviewBadges.jsx";

/**
 * 編集用の記録一覧。タイトルをタップで編集、「削除」で削除。
 * showReviews を付けると、各タイミングの復習チェック状況も表示する。
 */
export default function EntryList({ items, onSelect, onDelete, showReviews = false }) {
  if (items.length === 0) return <div className="muted box">記録なし</div>;

  return (
    <ul className="list">
      {items.map((item) => (
        <li key={item.id} className="list-row">
          <button type="button" className="list-btn" onClick={() => onSelect(item)}>
            <span className="list-btn-title">{item.title || "(無題)"}</span>
            {showReviews && <ReviewBadges item={item} stages={REVIEW_STAGES} />}
          </button>
          <button type="button" className="danger" onClick={() => onDelete(item)}>
            削除
          </button>
        </li>
      ))}
    </ul>
  );
}
