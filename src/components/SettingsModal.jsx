import { useI18n } from "../i18n/I18nProvider.jsx";
import { LANGUAGES } from "../i18n/translate.js";
import Modal from "./Modal.jsx";
import BackupPanel from "./BackupPanel.jsx";
import AccountPanel from "./AccountPanel.jsx";

/** 設定：アカウント（AWS の設定があるときだけ）・表示言語・バックアップ */
export default function SettingsModal({ settings, updateSettings, store, onClose }) {
  const { t } = useI18n();

  return (
    <Modal title={t("settings.title")} onClose={onClose}>
      {store.account && <AccountPanel account={store.account} />}

      <section className="modal-section">
        <label>
          <h3>{t("settings.language")}</h3>
          <select
            className="select"
            value={settings.language}
            onChange={(e) => updateSettings({ language: e.target.value })}
          >
            <option value="auto">{t("settings.languageAuto")}</option>
            {LANGUAGES.map(({ id, name }) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </section>

      <BackupPanel store={store} />
    </Modal>
  );
}
