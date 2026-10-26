import { useState } from "react";
import { useI18n } from "../i18n/I18nProvider.jsx";

/** 設定画面の「アカウント」：ログイン・新規登録・同期の状態・ログアウト */
export default function AccountPanel({ account }) {
  const { t } = useI18n();
  const { auth } = account;

  return (
    <section className="modal-section">
      <h3>{t("account.heading")}</h3>
      {auth.loggedIn ? <LoggedIn account={account} /> : <SignInForm account={account} />}
    </section>
  );
}

function SignInForm({ account }) {
  const { t } = useI18n();
  const expired = account.auth.expired;
  const [mode, setMode] = useState(expired ? "signIn" : "signUp"); // "signIn" | "signUp"
  const [username, setUsername] = useState(account.auth.username ?? "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const switchMode = (next) => {
    setMode(next);
    setError(null);
    setPassword("");
    setConfirm("");
  };

  const submit = async (e) => {
    e.preventDefault();
    if (mode === "signUp" && password !== confirm) return setError("passwordMismatch");
    setBusy(true);
    setError(null);
    try {
      const name = username.trim();
      await (mode === "signUp" ? account.signUp(name, password) : account.signIn(name, password));
    } catch (err) {
      setError(err.code ?? "unknown");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <p className="muted">{t(expired ? "account.expired" : "account.description")}</p>

      <div className="segmented" role="tablist">
        {["signUp", "signIn"].map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            className={mode === m ? "segment active" : "segment"}
            onClick={() => switchMode(m)}
          >
            {t(`account.${m}`)}
          </button>
        ))}
      </div>

      <form onSubmit={submit}>
        <div className="field">
          <label className="label" htmlFor="account-username">
            {t("account.username")}
          </label>
          <input
            id="account-username"
            className="input"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          {mode === "signUp" && <p className="hint">{t("account.usernameRule")}</p>}
        </div>
        <div className="field">
          <label className="label" htmlFor="account-password">
            {t("account.password")}
          </label>
          <input
            id="account-password"
            className="input"
            type="password"
            autoComplete={mode === "signUp" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {mode === "signUp" && <p className="hint">{t("account.passwordRule")}</p>}
        </div>
        {mode === "signUp" && (
          <div className="field">
            <label className="label" htmlFor="account-confirm">
              {t("account.passwordConfirm")}
            </label>
            <input
              id="account-confirm"
              className="input"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
        )}

        <div className="row account-actions">
          <button type="submit" disabled={busy || !username || !password}>
            {busy ? t("account.working") : t(`account.${mode}Submit`)}
          </button>
        </div>
      </form>

      {error && <p className="account-error">{t(`account.error.${error}`)}</p>}
      {mode === "signIn" && <p className="muted note">{t("account.forgotPassword")}</p>}
    </>
  );
}

function LoggedIn({ account }) {
  const { t, lang } = useI18n();
  const { auth, sync } = account;
  const [busy, setBusy] = useState(false);

  const lastSynced = sync.lastSyncedAt
    ? t("account.lastSynced", {
        time: new Date(sync.lastSyncedAt).toLocaleString(lang, {
          month: "numeric",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      })
    : t("account.notSynced");

  const signOut = async () => {
    setBusy(true);
    const unsent = await account.flush();
    setBusy(false);
    if (!window.confirm(t(unsent ? "account.confirmSignOutUnsent" : "account.confirmSignOut", { n: unsent }))) return;
    await account.signOut();
  };

  return (
    <>
      <p className="account-user">{t("account.signedInAs", { username: auth.username })}</p>
      <p className="sync-status">
        <span className={sync.syncing ? "sync-dot syncing" : sync.error ? "sync-dot error" : "sync-dot"} />
        {sync.syncing ? t("account.syncing") : lastSynced}
      </p>
      {sync.error && <p className="account-error">{t(`account.error.${sync.error}`)}</p>}

      <div className="row account-actions">
        <button type="button" disabled={sync.syncing} onClick={() => account.syncNow()}>
          {t("account.syncNow")}
        </button>
        <button type="button" className="danger" disabled={busy} onClick={signOut}>
          {t("account.signOut")}
        </button>
      </div>
    </>
  );
}
