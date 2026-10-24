import { useEffect, useState } from "react";
import { msUntilMidnight, todayKey } from "../lib/dates.js";

/**
 * 今日の日付キー。アプリを開いたまま日付が変わっても追従する。
 * （iPhone ではアプリが裏で止まるので、画面に戻ってきたときにも確認する）
 */
export function useToday() {
  const [today, setToday] = useState(todayKey);

  useEffect(() => {
    const refresh = () => setToday(todayKey());

    let timer;
    const scheduleMidnight = () => {
      timer = setTimeout(() => {
        refresh();
        scheduleMidnight();
      }, msUntilMidnight() + 1000);
    };

    scheduleMidnight();
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  return today;
}
