import { describe, expect, it } from "vitest";
import { addMonths, calendarDays, msUntilMidnight, reviewLabel, shiftDateKey, toDateKey } from "./dates.js";

describe("dates", () => {
  it("toDateKey はゼロ埋めした YYYY-MM-DD を返す", () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("shiftDateKey は月・年をまたいでずらせる", () => {
    expect(shiftDateKey("2026-03-01", -1)).toBe("2026-02-28");
    expect(shiftDateKey("2026-01-03", -14)).toBe("2025-12-20");
    expect(shiftDateKey("2024-02-28", 1)).toBe("2024-02-29");
  });

  it("reviewLabel は固定タイミングに名前を付ける", () => {
    expect(reviewLabel(1, "2026-10-23")).toBe("昨日（2026-10-23）");
    expect(reviewLabel(14, "2026-10-10")).toBe("2週間前（2026-10-10）");
    expect(reviewLabel(20, "2026-10-04")).toBe("2026-10-04（20日前）");
  });

  it("addMonths は年をまたぐ", () => {
    expect(addMonths({ year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 });
    expect(addMonths({ year: 2026, month: 11 }, 1)).toEqual({ year: 2027, month: 0 });
  });

  it("calendarDays は日曜始まりで 7 の倍数のマスを返す", () => {
    const days = calendarDays(2026, 9); // 2026年10月（1日は木曜）
    expect(days.length % 7).toBe(0);
    expect(days[0]).toEqual({ dateKey: "2026-09-27", day: 27, inMonth: false });
    expect(days[4]).toEqual({ dateKey: "2026-10-01", day: 1, inMonth: true });
    expect(days.filter((d) => d.inMonth)).toHaveLength(31);
  });

  it("msUntilMidnight は次の 0 時までの時間", () => {
    expect(msUntilMidnight(new Date(2026, 9, 24, 23, 59, 0))).toBe(60_000);
  });
});
