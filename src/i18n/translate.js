import ja from "./ja.js";
import en from "./en.js";

export const MESSAGES = { ja, en };
export const LANGUAGES = [
  { id: "ja", name: "日本語" },
  { id: "en", name: "English" },
];

/** 端末の言語設定から表示言語を決める（日本語以外は英語） */
export function detectLanguage(languages = navigator.languages ?? [navigator.language]) {
  return languages[0]?.toLowerCase().startsWith("ja") ? "ja" : "en";
}

/** 設定値（"auto" / "ja" / "en"）を実際の表示言語にする */
export function resolveLanguage(preference) {
  return MESSAGES[preference] ? preference : detectLanguage();
}

/**
 * 文言を取り出す。{name} の部分は params の値に置き換える。
 * 見つからなければ日本語、それもなければキーそのものを返す。
 */
export function translate(lang, key, params = {}) {
  const value = MESSAGES[lang]?.[key] ?? ja[key] ?? key;
  if (typeof value === "function") return value(params);
  if (typeof value === "string") return value.replace(/\{(\w+)\}/g, (match, name) => params[name] ?? match);
  return value;
}
