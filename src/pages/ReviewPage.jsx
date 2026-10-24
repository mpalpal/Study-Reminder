import { useState } from "react";
import { getItems } from "../lib/logs.js";
import { reviewLabel, shiftDateKey } from "../lib/dates.js";
import ReviewList from "../components/ReviewList.jsx";

const FIXED_DAYS_AGO = [1, 7, 14]; // 常に表示する復習タイミング
const PAST_DAYS_MAX = 30; // 「過去の学習」で選べる範囲

export default function ReviewPage({ hidden, today, logs }) {
  // 開いているメモは画面全体で1つだけ：{ section, id }
  const [opened, setOpened] = useState(null);
  const [pastDaysAgo, setPastDaysAgo] = useState(0);

  const section = (sectionId, daysAgo) => {
    const dateKey = shiftDateKey(today, -daysAgo);
    const label = reviewLabel(daysAgo, dateKey);
    return (
      <ReviewList
        label={label}
        items={getItems(logs, dateKey)}
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
      {FIXED_DAYS_AGO.map((daysAgo) => (
        <div key={daysAgo} className="card">
          {section(`fixed-${daysAgo}`, daysAgo)}
        </div>
      ))}

      <details className="card">
        <summary className="summary">▶︎過去の学習</summary>
        <div className="details-body">
          <div className="row past-picker">
            <label className="past-picker-field">
              <span className="label">日付</span>
              <select className="select" value={pastDaysAgo} onChange={(e) => selectPastDay(Number(e.target.value))}>
                {Array.from({ length: PAST_DAYS_MAX + 1 }, (_, i) => (
                  <option key={i} value={i}>
                    {i === 0 ? "今日" : `${i}日前`}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="secondary" onClick={() => selectPastDay(0)}>
              今日
            </button>
          </div>
          {section("past", pastDaysAgo)}
        </div>
      </details>
    </section>
  );
}
