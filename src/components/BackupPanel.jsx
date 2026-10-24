import { useRef } from "react";
import { downloadBackup, readBackupFile } from "../lib/backup.js";
import { useFlashMessage } from "../hooks/useFlashMessage.js";
import { useI18n } from "../i18n/I18nProvider.jsx";

/** JSON バックアップのエクスポート・インポートと全削除（設定画面の中） */
export default function BackupPanel({ store }) {
  const { t } = useI18n();
  const fileInput = useRef(null);
  const [message, flash] = useFlashMessage(3000);

  const handleExport = () => {
    downloadBackup(store.logs);
    flash(t("backup.exported"));
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (!window.confirm(t("backup.confirmImport"))) return;
      store.replaceAll(await readBackupFile(file));
      flash(t("backup.imported"));
    } catch (err) {
      const reason = t(`backupError.${err.code ?? "unknown"}`, { dateKey: err.dateKey });
      flash(t("backup.importFailed", { reason }));
    } finally {
      e.target.value = ""; // 同じファイルをもう一度選べるようにする
    }
  };

  const handleWipe = () => {
    if (!window.confirm(t("backup.confirmWipe"))) return;
    store.clearAll();
    flash(t("backup.wiped"));
  };

  return (
    <section className="modal-section">
      <h3>{t("backup.heading")}</h3>
      <p className="muted">{t("backup.hint")}</p>

      <div className="row backup-actions">
        <button type="button" onClick={handleExport}>
          {t("backup.export")}
        </button>
        <button type="button" onClick={() => fileInput.current.click()}>
          {t("backup.import")}
        </button>
        <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={handleImport} />
        <button type="button" className="danger" onClick={handleWipe}>
          {t("backup.wipe")}
        </button>
      </div>

      <p className="msg">{message}</p>
    </section>
  );
}
