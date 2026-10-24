/** 編集用の記録一覧。タイトルをタップで編集、「削除」で削除。 */
export default function EntryList({ items, onSelect, onDelete }) {
  if (items.length === 0) return <div className="muted box">記録なし</div>;

  return (
    <ul className="list">
      {items.map((item) => (
        <li key={item.id} className="list-row">
          <button type="button" className="list-btn" onClick={() => onSelect(item)}>
            {item.title || "(無題)"}
          </button>
          <button type="button" className="danger" onClick={() => onDelete(item)}>
            削除
          </button>
        </li>
      ))}
    </ul>
  );
}
