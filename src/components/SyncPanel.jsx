import { useState } from "react";
import { formatSyncKey } from "../lib/sync/syncKey.js";
import { useFlashMessage } from "../hooks/useFlashMessage.js";
import { useI18n } from "../i18n/I18nProvider.jsx";

/** 設定画面の「端末間の同期」 */
export default function SyncPanel({ sync }) {
  const { t } = useI18n();
  const { status } = sync;
  const [showKey, setShowKey] = useState(false); // 作った直後は同期キーを見せる

  return (
    <section className="modal-section">
      <h3>{t("sync.heading")}</h3>
      {status.enabled ? (
        <Connected sync={sync} showKey={showKey} setShowKey={setShowKey} />
      ) : (
        <NotConnected sync={sync} onCreated={() => setShowKey(true)} />
      )}
      {status.error && <p className="sync-error">{t(`sync.error.${status.error}`)}</p>}
    </section>
  );
}

/** 同期していないとき：始める or つなぐ */
function NotConnected({ sync, onCreated }) {
  const { t } = useI18n();
  const [joining, setJoining] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const run = async (action) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err.code ?? "server");
    } finally {
      setBusy(false);
    }
  };

  const start = () => {
    if (!window.confirm(t("sync.confirmStart"))) return;
    run(async () => {
      await sync.create();
      onCreated();
    });
  };

  return (
    <>
      <p className="muted">{t("sync.description")}</p>

      {joining ? (
        <div className="field">
          <label className="label" htmlFor="sync-key-input">
            {t("sync.keyLabel")}
          </label>
          <input
            id="sync-key-input"
            className="input sync-key-input"
            placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <div className="row sync-actions">
            <button type="button" disabled={busy} onClick={() => run(() => sync.connect(input))}>
              {busy ? t("sync.statusSyncing") : t("sync.connect")}
            </button>
            <button type="button" className="secondary" disabled={busy} onClick={() => setJoining(false)}>
              {t("sync.cancel")}
            </button>
          </div>
        </div>
      ) : (
        <div className="row sync-actions">
          <button type="button" disabled={busy} onClick={start}>
            {busy ? t("sync.statusSyncing") : t("sync.start")}
          </button>
          <button type="button" className="secondary" disabled={busy} onClick={() => setJoining(true)}>
            {t("sync.join")}
          </button>
        </div>
      )}

      {error && <p className="sync-error">{t(`sync.error.${error}`)}</p>}
    </>
  );
}

/** 同期中：状態・今すぐ同期・同期キーの表示・解除 */
function Connected({ sync, showKey, setShowKey }) {
  const { t, lang } = useI18n();
  const { status } = sync;
  const [message, flash] = useFlashMessage();

  const lastSynced = status.lastSyncedAt
    ? t("sync.statusSynced", {
        time: new Date(status.lastSyncedAt).toLocaleString(lang, {
          month: "numeric",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      })
    : t("sync.statusNever");

  const copyKey = async () => {
    try {
      await navigator.clipboard.writeText(formatSyncKey(status.syncKey));
      flash(t("sync.copied"));
    } catch {
      setShowKey(true); // コピーできない環境では表示して手で写してもらう
    }
  };

  const disconnect = () => {
    if (!window.confirm(t("sync.confirmDisconnect"))) return;
    setShowKey(false);
    sync.disconnect();
  };

  return (
    <>
      <p className="sync-status">
        <span className={status.syncing ? "sync-dot syncing" : status.error ? "sync-dot error" : "sync-dot"} />
        {status.syncing ? t("sync.statusSyncing") : lastSynced}
      </p>

      <div className="row sync-actions">
        <button type="button" disabled={status.syncing} onClick={() => sync.syncNow()}>
          {t("sync.now")}
        </button>
        <button type="button" className="secondary" onClick={() => setShowKey((v) => !v)}>
          {showKey ? t("sync.hideKey") : t("sync.showKey")}
        </button>
      </div>

      {showKey && (
        <div className="sync-key-box">
          <span className="label">{t("sync.keyLabel")}</span>
          <code className="sync-key">{formatSyncKey(status.syncKey)}</code>
          <div className="row sync-actions">
            <button type="button" className="secondary" onClick={copyKey}>
              {t("sync.copy")}
            </button>
            <span className="msg">{message}</span>
          </div>
          <p className="muted note">{t("sync.keyWarning")}</p>
        </div>
      )}

      <div className="row sync-actions">
        <button type="button" className="danger" onClick={disconnect}>
          {t("sync.disconnect")}
        </button>
      </div>
    </>
  );
}
