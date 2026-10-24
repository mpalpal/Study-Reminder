import { getItems } from "../lib/logs.js";
import { useEntryEditor } from "../hooks/useEntryEditor.js";
import { useI18n } from "../i18n/I18nProvider.jsx";
import EntryForm from "../components/EntryForm.jsx";
import EntryList from "../components/EntryList.jsx";

export default function RecordPage({ hidden, today, store }) {
  const { t } = useI18n();
  const editor = useEntryEditor(today, store);

  return (
    <section hidden={hidden}>
      <EntryForm heading={t("record.heading")} subtitle={today} addLabel={t("form.save")} editor={editor} />

      <div className="card">
        <h3>{t("record.listHeading")}</h3>
        <EntryList items={getItems(store.logs, today)} onSelect={editor.startEdit} onDelete={editor.remove} />
      </div>
    </section>
  );
}
