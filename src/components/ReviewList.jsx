import { Fragment, useEffect, useRef } from "react";

/** 復習用の記録一覧。タイトルをタップすると、その下にメモが開く。 */
export default function ReviewList({ label, items, openId, onToggle }) {
  return (
    <>
      <h3>{label}</h3>
      {items.length === 0 ? (
        <div className="muted box">記録なし</div>
      ) : (
        <ul className="list">
          {items.map((item) => (
            <Fragment key={item.id}>
              <li>
                <button
                  type="button"
                  className="list-btn"
                  aria-expanded={item.id === openId}
                  onClick={() => onToggle(item.id)}
                >
                  {item.title || "(無題)"}
                </button>
              </li>
              {item.id === openId && (
                <li>
                  <InlineDetail item={item} label={label} />
                </li>
              )}
            </Fragment>
          ))}
        </ul>
      )}
    </>
  );
}

function InlineDetail({ item, label }) {
  const ref = useRef(null);

  // 開いたときに画面外なら、見える位置まで少しスクロールする
  useEffect(() => {
    ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, []);

  return (
    <div ref={ref} className="inline-detail">
      <div className="detail-title">{item.title || "(無題)"}</div>
      <div className="detail-meta muted">{label}</div>
      <pre className="pre">{item.body}</pre>
    </div>
  );
}
