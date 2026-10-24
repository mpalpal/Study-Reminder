import { useEffect } from "react";

/** 使い方（画像）を表示するモーダル。背景タップ・×・Esc キーで閉じる。 */
export default function HelpModal({ onClose }) {
  useEffect(() => {
    const onKeyDown = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="modal">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-panel" role="dialog" aria-modal="true" aria-label="使い方">
        <div className="modal-head">
          <div className="modal-title">使い方</div>
          <button type="button" className="icon-btn" aria-label="閉じる" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <img className="help-image" src="/help.png" alt="Study Reminder 使い方" />
        </div>
      </div>
    </div>
  );
}
