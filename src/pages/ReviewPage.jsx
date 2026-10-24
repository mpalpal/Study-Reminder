import { useState } from "react";
import { getItems } from "../lib/logs.js";
import { shiftDateKey } from "../lib/dates.js";
import { REVIEW_STAGES, reviewLabel } from "../lib/reviews.js";
import { useI18n } from "../i18n/I18nProvider.jsx";
import ReviewList from "../components/ReviewList.jsx";

const PAST_DAYS_MAX = 30; // 「過去の学習」で選べる範囲

export default function ReviewPage({ hidden, today, store }) {
  const { t } = useI18n();
  // 開いているメモは画面全体で1つだけ：{ section, id }
  const [opened, setOpened] = useState(null);
  const [pastDaysAgo, setPastDaysAgo] = useState(0);

  // stage を渡すと、そのタイミングの復習チェックができる一覧になる
  const section = (sectionId, daysAgo, stage) => {
    const dateKey = shiftDateKey(today, -daysAgo);
    return (
      <ReviewList
        label={reviewLabel(t, daysAgo, dateKey)}
        items={getItems(store.logs, dateKey)}
        stage={stage}
        onCheck={(id, checked) => store.setReviewed(dateKey, id, stage, checked)}
        openId={opened?.section === sectionId ? opened.id : null}
        onToggle={(id) =>
          setOpened((cur) => (cur?.section === sectionId && cur.id === id ? null : { section: sectionId, id }))
        }
      />
    );
  };

  const selectPastDay = (daysAgo) => {
    setPastDaysAgo(daysAgo);
    setOpened(null);
  };

  return (
    <section hidden={hidden}>
      {REVIEW_STAGES.map(({ days }) => (
        <div key={days} className="card">
          {section(`stage-${days}`, days, days)}
        </div>
      ))}

      <details className="card">
        <summary className="summary">{t("review.past")}</summary>
        <div className="details-body">
          <div className="row past-picker">
            <label className="past-picker-field">
              <span className="label">{t("review.date")}</span>
              <select className="select" value={pastDaysAgo} onChange={(e) => selectPastDay(Number(e.target.value))}>
                {Array.from({ length: PAST_DAYS_MAX + 1 }, (_, i) => (
                  <option key={i} value={i}>
                    {i === 0 ? t("day.today") : t("day.daysAgo", { n: i })}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="secondary" onClick={() => selectPastDay(0)}>
              {t("day.today")}
            </button>
          </div>
          {section("past", pastDaysAgo, null)}
        </div>
      </details>
    </section>
  );
}
