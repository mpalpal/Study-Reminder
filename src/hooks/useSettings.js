import { useState } from "react";

// アプリの設定。記録データとは別のキーで保存する（バックアップには含めない）。
const SETTINGS_KEY = "studyReminderSettings";
const DEFAULT_SETTINGS = { language: "auto" };

function loadSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}") };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** [設定, 一部を変更する関数] を返す */
export function useSettings() {
  const [settings, setSettings] = useState(loadSettings);

  const updateSettings = (changes) => {
    const next = { ...settings, ...changes };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    setSettings(next);
  };

  return [settings, updateSettings];
}
