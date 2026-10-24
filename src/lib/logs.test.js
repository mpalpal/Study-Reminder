import { describe, expect, it } from "vitest";
import { getItems, removeEntry, upsertEntry, validateLogs } from "./logs.js";
import { parseBackup } from "./backup.js";

// 旧バージョンで保存されていた形のデータ
const oldLogs = {
  "2026-10-20": {
    items: [{ id: "1729-abc", title: "財務会計論 3章", body: "問2は要復習", createdAt: 1, updatedAt: 1 }],
  },
};

describe("logs", () => {
  it("新規の記録は先頭に追加される", () => {
    const next = upsertEntry(oldLogs, "2026-10-20", { title: "新", body: "メモ" }, 100);
    const items = getItems(next, "2026-10-20");
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ title: "新", body: "メモ", createdAt: 100, updatedAt: 100 });
    expect(getItems(oldLogs, "2026-10-20")).toHaveLength(1); // 元のデータは変わらない
  });

  it("既存の記録を更新すると createdAt と他の項目は保たれる", () => {
    const withExtra = { "2026-10-20": { items: [{ ...oldLogs["2026-10-20"].items[0], extra: "keep" }] } };
    const next = upsertEntry(withExtra, "2026-10-20", { id: "1729-abc", title: "改", body: "改メモ" }, 200);
    expect(getItems(next, "2026-10-20")).toEqual([
      { id: "1729-abc", title: "改", body: "改メモ", createdAt: 1, updatedAt: 200, extra: "keep" },
    ]);
  });

  it("最後の1件を削除すると日付ごと消える", () => {
    expect(removeEntry(oldLogs, "2026-10-20", "1729-abc")).toEqual({});
  });

  it("validateLogs は旧形式のデータを受け入れ、不正な形は拒否する", () => {
    expect(validateLogs(oldLogs)).toBeNull();
    expect(validateLogs({ "2026-10-20": { items: [] } })).toBeNull();
    expect(validateLogs({ "10/20": { items: [] } })).toMatch("日付キー");
    expect(validateLogs({ "2026-10-20": {} })).toMatch("items");
    expect(validateLogs([])).toMatch("データ構造");
  });

  it("旧バージョンのバックアップファイルを読み込める", () => {
    const file = JSON.stringify({ app: "StudyLog", version: 1, storageKey: "studyLogsV2", data: oldLogs });
    expect(parseBackup(file)).toEqual(oldLogs);
    expect(() => parseBackup("not json")).toThrow("JSON形式が不正です");
    expect(() => parseBackup("{}")).toThrow("data が見つかりません");
  });
});
