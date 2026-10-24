import { useEffect } from "react";
import { useI18n } from "../i18n/I18nProvider.jsx";

/** 画面中央に出るパネル。背景タップ・×・Esc キーで閉じる。 */
export default function Modal({ title, onClose, children }) {
  const { t } = useI18n();

  useEffect(() => {
    const onKeyDown = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="modal">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-panel" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2 className="modal-title">{title}</h2>
          <button type="button" className="icon-btn" aria-label={t("common.close")} onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
