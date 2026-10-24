import { useState } from "react";
import { getItems, hasItems } from "../lib/logs.js";
import { useEntryEditor } from "../hooks/useEntryEditor.js";
import { useI18n } from "../i18n/I18nProvider.jsx";
import Calendar from "../components/Calendar.jsx";
import EntryForm from "../components/EntryForm.jsx";
import EntryList from "../components/EntryList.jsx";

export default function HistoryPage({ hidden, today, store }) {
  const { t } = useI18n();
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
        <h3>{t("history.recordsOf", { date: selectedKey })}</h3>
        <EntryList
          items={getItems(store.logs, selectedKey)}
          onSelect={editor.startEdit}
          onDelete={editor.remove}
          showReviews
        />
      </div>

      <EntryForm
        heading={t("history.formHeading")}
        subtitle={t(editor.isEditing ? "history.editingOn" : "history.addingTo", { date: selectedKey })}
        addLabel={t("form.add")}
        editor={editor}
      />
    </section>
  );
}
