import { useState } from "react";
import { I18nProvider, useI18n } from "./i18n/I18nProvider.jsx";
import { useHashRoute } from "./hooks/useHashRoute.js";
import { useSettings } from "./hooks/useSettings.js";
import { useStudyLogs } from "./hooks/useStudyLogs.js";
import { useToday } from "./hooks/useToday.js";
import ReviewPage from "./pages/ReviewPage.jsx";
import RecordPage from "./pages/RecordPage.jsx";
import HistoryPage from "./pages/HistoryPage.jsx";
import HelpModal from "./components/HelpModal.jsx";
import SettingsModal from "./components/SettingsModal.jsx";

const PAGE_IDS = ["review", "record", "history"];

export default function App() {
  const [settings, updateSettings] = useSettings();

  return (
    <I18nProvider preference={settings.language}>
      <AppShell settings={settings} updateSettings={updateSettings} />
    </I18nProvider>
  );
}

function AppShell({ settings, updateSettings }) {
  const { t } = useI18n();
  const page = useHashRoute(PAGE_IDS);
  const today = useToday();
  const store = useStudyLogs();
  const [openModal, setOpenModal] = useState(null); // "help" | "settings" | null
  const closeModal = () => setOpenModal(null);

  // 3ページとも常に描画しておき、表示中以外は隠す（タブを切り替えても入力途中の内容が消えない）
  return (
    <>
      <header className="topbar">
        <div className="header-actions">
          <button type="button" className="icon-btn" aria-label={t("header.help")} onClick={() => setOpenModal("help")}>
            ?
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label={t("header.settings")}
            onClick={() => setOpenModal("settings")}
          >
            <GearIcon />
          </button>
        </div>
        <h1 className="app-title">Study Reminder</h1>
        <nav className="tabs">
          {PAGE_IDS.map((id) => (
            <a key={id} href={`#${id}`} className={page === id ? "tab active" : "tab"}>
              {t(`tabs.${id}`)}
            </a>
          ))}
        </nav>
      </header>

      <main className="container">
        <ReviewPage hidden={page !== "review"} today={today} store={store} />
        <RecordPage hidden={page !== "record"} today={today} store={store} />
        <HistoryPage hidden={page !== "history"} today={today} store={store} />
      </main>

      {openModal === "help" && <HelpModal onClose={closeModal} />}
      {openModal === "settings" && (
        <SettingsModal settings={settings} updateSettings={updateSettings} store={store} onClose={closeModal} />
      )}
    </>
  );
}

function GearIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.85 1 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
