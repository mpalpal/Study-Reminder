import { getItems } from "../lib/logs.js";
import { useEntryEditor } from "../hooks/useEntryEditor.js";
import EntryForm from "../components/EntryForm.jsx";
import EntryList from "../components/EntryList.jsx";

export default function RecordPage({ hidden, today, store }) {
  const editor = useEntryEditor(today, store);

  return (
    <section hidden={hidden}>
      <EntryForm heading="今日の記録" subtitle={today} addLabel="保存" editor={editor} />

      <div className="card">
        <h3>今日の学習</h3>
        <EntryList items={getItems(store.logs, today)} onSelect={editor.startEdit} onDelete={editor.remove} />
      </div>
    </section>
  );
}
