import { describe, expect, it } from "vitest";
import ja from "./ja.js";
import en from "./en.js";
import { detectLanguage, resolveLanguage, translate } from "./translate.js";

describe("i18n", () => {
  it("日本語と英語で同じキーがそろっている", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(ja).sort());
  });

  it("端末の言語が日本語なら日本語、それ以外は英語", () => {
    expect(detectLanguage(["ja-JP", "en-US"])).toBe("ja");
    expect(detectLanguage(["en-US", "ja-JP"])).toBe("en");
    expect(detectLanguage(["fr-FR"])).toBe("en");
    expect(detectLanguage([])).toBe("en");
  });

  it("設定値が ja / en ならそれを使う", () => {
    expect(resolveLanguage("ja")).toBe("ja");
    expect(resolveLanguage("en")).toBe("en");
  });

  it("差し込み・関数・複数形", () => {
    expect(translate("ja", "history.recordsOf", { date: "2026-10-23" })).toBe("2026-10-23 の記録");
    expect(translate("en", "day.daysAgo", { n: 1 })).toBe("1 day ago");
    expect(translate("en", "day.daysAgo", { n: 3 })).toBe("3 days ago");
    expect(translate("en", "no.such.key")).toBe("no.such.key");
  });
});
