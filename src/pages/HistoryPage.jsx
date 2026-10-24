import { useState } from "react";
import { getItems, hasItems } from "../lib/logs.js";
import { useEntryEditor } from "../hooks/useEntryEditor.js";
import Calendar from "../components/Calendar.jsx";
import EntryForm from "../components/EntryForm.jsx";
import EntryList from "../components/EntryList.jsx";
import BackupPanel from "../components/BackupPanel.jsx";

export default function HistoryPage({ hidden, today, store }) {
  const [selectedKey, setSelectedKey] = useState(today);
  const editor = useEntryEditor(selectedKey, store);

  return (
    <section hidden={hidden}>
      <Calendar
        today={today}
        selectedKey={selectedKey}
        hasRecord={(dateKey) => hasItems(store.logs, dateKey)}
        onSelect={setSelectedKey}
      />

      <div className="card">
        <h3>{selectedKey} の記録</h3>
        <EntryList
          items={getItems(store.logs, selectedKey)}
          onSelect={editor.startEdit}
          onDelete={editor.remove}
          showReviews
        />
      </div>

      <EntryForm
        heading="編集 / 追加"
        subtitle={editor.isEditing ? `編集中：${selectedKey}` : `追加先：${selectedKey}`}
        addLabel="追加"
        editor={editor}
      />

      <BackupPanel store={store} />
    </section>
  );
}
