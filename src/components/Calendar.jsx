import { useState } from "react";
import { addMonths, calendarDays, monthLabel, monthOf } from "../lib/dates.js";
import { useI18n } from "../i18n/I18nProvider.jsx";

/** 月表示のカレンダー。記録がある日はピンク、選択中の日は枠線で表示する。 */
export default function Calendar({ today, selectedKey, hasRecord, onSelect }) {
  const { t } = useI18n();
  const [cursor, setCursor] = useState(() => monthOf(today)); // 表示中の { year, month }
  const moveMonth = (delta) => setCursor(addMonths(cursor, delta));

  return (
    <>
      <div className="card">
        <div className="row">
          <h2 className="calendar-title">{t("history.heading")}</h2>
          <div className="calendar-nav">
            <button type="button" className="secondary" aria-label={t("history.prevMonth")} onClick={() => moveMonth(-1)}>
              ＜
            </button>
            <button type="button" className="secondary" onClick={() => setCursor(monthOf(today))}>
              {t("history.thisMonth")}
            </button>
            <button type="button" className="secondary" aria-label={t("history.nextMonth")} onClick={() => moveMonth(1)}>
              ＞
            </button>
          </div>
        </div>
        <p className="muted calendar-month">{t("history.showing", { month: monthLabel(cursor.year, cursor.month) })}</p>
      </div>

      <div className="card">
        <div className="calendar">
          {t("history.weekdays").map((w) => (
            <div key={w} className="cal-head">
              {w}
            </div>
          ))}
          {calendarDays(cursor.year, cursor.month).map(({ dateKey, day, inMonth }) => {
            const classes = [
              "cal-day",
              !inMonth && "is-out",
              hasRecord(dateKey) && "has-record",
              dateKey === selectedKey && "is-selected",
            ];
            return (
              <button
                key={dateKey}
                type="button"
                className={classes.filter(Boolean).join(" ")}
                onClick={() => onSelect(dateKey)}
              >
                {day}
              </button>
            );
          })}
        </div>
        <p className="muted note">{t("history.legend")}</p>
      </div>
    </>
  );
}
