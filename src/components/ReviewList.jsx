import { Fragment, useEffect, useRef } from "react";
import { REVIEW_STAGES, isReviewed, stagesBefore } from "../lib/reviews.js";
import { useI18n } from "../i18n/I18nProvider.jsx";
import ReviewBadges from "./ReviewBadges.jsx";

/**
 * 復習用の記録一覧。タイトルをタップすると、その下にメモが開く。
 * stage（1・7・14）があれば、そのタイミングの復習チェックボタンと、前のタイミングのチェック状況を表示する。
 * stage がなければ（「過去の学習」）、全タイミングのチェック状況を表示するだけ。
 */
export default function ReviewList({ label, items, stage, onCheck, openId, onToggle }) {
  const { t } = useI18n();
  const badgeStages = stage ? stagesBefore(stage) : REVIEW_STAGES;
  const doneCount = stage ? items.filter((item) => isReviewed(item, stage)).length : 0;

  return (
    <>
      <div className="review-heading">
        <h3>{label}</h3>
        {stage && items.length > 0 && (
          <span className={doneCount === items.length ? "review-progress complete" : "review-progress"}>
            {t("review.progress", { done: doneCount, total: items.length })}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="muted box">{t("common.empty")}</div>
      ) : (
        <ul className="list">
          {items.map((item) => {
            const title = item.title || t("common.untitled");
            const reviewed = stage && isReviewed(item, stage);
            return (
              <Fragment key={item.id}>
                <li className={stage ? "list-row" : undefined}>
                  <button
                    type="button"
                    className={reviewed ? "list-btn is-reviewed" : "list-btn"}
                    aria-expanded={item.id === openId}
                    onClick={() => onToggle(item.id)}
                  >
                    <span className="list-btn-title">{title}</span>
                    <ReviewBadges item={item} stages={badgeStages} />
                  </button>
                  {stage && (
                    <button
                      type="button"
                      className={reviewed ? "check-btn checked" : "check-btn"}
                      aria-pressed={reviewed}
                      aria-label={t("review.markReviewed", { title })}
                      onClick={() => onCheck(item.id, !reviewed)}
                    >
                      ✓
                    </button>
                  )}
                </li>
                {item.id === openId && (
                  <li>
                    <InlineDetail item={item} label={label} />
                  </li>
                )}
              </Fragment>
            );
          })}
        </ul>
      )}
    </>
  );
}

function InlineDetail({ item, label }) {
  const { t } = useI18n();
  const ref = useRef(null);

  // 開いたときに画面外なら、見える位置まで少しスクロールする
  useEffect(() => {
    ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, []);

  return (
    <div ref={ref} className="inline-detail">
      <div className="detail-title">{item.title || t("common.untitled")}</div>
      <div className="detail-meta muted">{label}</div>
      <pre className="pre">{item.body}</pre>
    </div>
  );
}
