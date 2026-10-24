import { useRef } from "react";
import { downloadBackup, readBackupFile } from "../lib/backup.js";
import { useFlashMessage } from "../hooks/useFlashMessage.js";

/** JSON バックアップのエクスポート・インポートと全削除 */
export default function BackupPanel({ store }) {
  const fileInput = useRef(null);
  const [message, flash] = useFlashMessage(3000);

  const handleExport = () => {
    downloadBackup(store.logs);
    flash("エクスポートしました（ファイルに保存してください）");
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const ok = window.confirm(
        "インポートすると、今のデータは上書きされます。続行しますか？\n（不安なら先にエクスポートしてください）",
      );
      if (!ok) return;
      store.replaceAll(await readBackupFile(file));
      flash("インポートしました");
    } catch (err) {
      flash(`インポート失敗: ${err.message}`);
    } finally {
      e.target.value = ""; // 同じファイルをもう一度選べるようにする
    }
  };

  const handleClear = () => {
    if (!window.confirm("本当に全データを削除しますか？\n（先にエクスポート推奨）")) return;
    store.clearAll();
    flash("全削除しました");
  };

  return (
    <div className="card">
      <h3>バックアップ (JSON)</h3>
      <p className="muted">iCloud Driveにデータ保存</p>

      <div className="row backup-actions">
        <button type="button" onClick={handleExport}>
          エクスポート
        </button>
        <button type="button" onClick={() => fileInput.current.click()}>
          インポート
        </button>
        <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={handleImport} />
        <button type="button" className="danger" onClick={handleClear}>
          記録削除
        </button>
      </div>

      <p className="msg">{message}</p>
    </div>
  );
}
