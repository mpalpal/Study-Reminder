import { describe, expect, it } from "vitest";
import { getItems, setReviewed, upsertEntry } from "./logs.js";
import { isReviewed, reviewLabel, stagesBefore } from "./reviews.js";
import { translate } from "../i18n/translate.js";

const base = {
  "2026-10-10": { items: [{ id: "a", title: "T", body: "B", createdAt: 1, updatedAt: 1 }] },
};
const itemOf = (logs) => getItems(logs, "2026-10-10")[0];

describe("復習チェック", () => {
  it("reviews がない古いデータは未チェック扱い", () => {
    expect(isReviewed(itemOf(base), 1)).toBe(false);
  });

  it("タイミングごとに独立してチェックでき、内容の更新日時は変えない", () => {
    let logs = setReviewed(base, "2026-10-10", "a", 1, true, 100);
    logs = setReviewed(logs, "2026-10-10", "a", 14, true, 200);
    expect(itemOf(logs)).toEqual({ id: "a", title: "T", body: "B", createdAt: 1, updatedAt: 1, reviews: { 1: 100, 14: 200 } });
    expect(isReviewed(itemOf(logs), 7)).toBe(false);
  });

  it("チェックを外し、すべて外れたら reviews 項目ごと消える", () => {
    let logs = setReviewed(base, "2026-10-10", "a", 7, true, 100);
    logs = setReviewed(logs, "2026-10-10", "a", 7, false);
    expect(itemOf(logs)).toEqual(itemOf(base));
  });

  it("記録を編集してもチェックは残る", () => {
    let logs = setReviewed(base, "2026-10-10", "a", 1, true, 100);
    logs = upsertEntry(logs, "2026-10-10", { id: "a", title: "T2", body: "B2" }, 300);
    expect(itemOf(logs).reviews).toEqual({ 1: 100 });
  });

  it("stagesBefore は前のタイミングだけを返す", () => {
    expect(stagesBefore(1)).toEqual([]);
    expect(stagesBefore(14).map((s) => s.days)).toEqual([1, 7]);
  });

  it("reviewLabel は固定タイミングに名前を付ける（日本語・英語）", () => {
    const ja = (key, params) => translate("ja", key, params);
    const en = (key, params) => translate("en", key, params);
    expect(reviewLabel(ja, 0, "2026-10-24")).toBe("今日（2026-10-24）");
    expect(reviewLabel(ja, 14, "2026-10-10")).toBe("2週間前（2026-10-10）");
    expect(reviewLabel(ja, 20, "2026-10-04")).toBe("2026-10-04（20日前）");
    expect(reviewLabel(en, 1, "2026-10-23")).toBe("Yesterday (2026-10-23)");
    expect(reviewLabel(en, 2, "2026-10-22")).toBe("2026-10-22 (2 days ago)");
  });
});
