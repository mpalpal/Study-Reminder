import { useState } from "react";
import { useHashRoute } from "./hooks/useHashRoute.js";
import { useStudyLogs } from "./hooks/useStudyLogs.js";
import { useToday } from "./hooks/useToday.js";
import ReviewPage from "./pages/ReviewPage.jsx";
import RecordPage from "./pages/RecordPage.jsx";
import HistoryPage from "./pages/HistoryPage.jsx";
import HelpModal from "./components/HelpModal.jsx";

const TABS = [
  { id: "review", label: "復習" },
  { id: "record", label: "記録" },
  { id: "history", label: "履歴" },
];
const PAGE_IDS = TABS.map((tab) => tab.id);

export default function App() {
  const page = useHashRoute(PAGE_IDS);
  const today = useToday();
  const store = useStudyLogs();
  const [helpOpen, setHelpOpen] = useState(false);

  // 3ページとも常に描画しておき、表示中以外は隠す（タブを切り替えても入力途中の内容が消えない）
  return (
    <>
      <header className="topbar">
        <button type="button" className="icon-btn help-btn" aria-label="使い方" onClick={() => setHelpOpen(true)}>
          ?
        </button>
        <h1 className="app-title">Study Reminder</h1>
        <nav className="tabs">
          {TABS.map((tab) => (
            <a key={tab.id} href={`#${tab.id}`} className={page === tab.id ? "tab active" : "tab"}>
              {tab.label}
            </a>
          ))}
        </nav>
      </header>

      <main className="container">
        <ReviewPage hidden={page !== "review"} today={today} logs={store.logs} />
        <RecordPage hidden={page !== "record"} today={today} store={store} />
        <HistoryPage hidden={page !== "history"} today={today} store={store} />
      </main>

      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
    </>
  );
}
