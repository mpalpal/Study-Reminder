import { createContext, useContext, useEffect, useMemo } from "react";
import { resolveLanguage, translate } from "./translate.js";

const I18nContext = createContext(null);

/** 表示言語を子コンポーネントに配る。preference は設定値（"auto" / "ja" / "en"） */
export function I18nProvider({ preference, children }) {
  const lang = resolveLanguage(preference);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo(() => ({ lang, t: (key, params) => translate(lang, key, params) }), [lang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** { t, lang } を返す。t("tabs.review") のように文言を取り出す。 */
export function useI18n() {
  return useContext(I18nContext);
}
