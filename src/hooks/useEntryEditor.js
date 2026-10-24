import { useState } from "react";
import { useFlashMessage } from "./useFlashMessage.js";

const EMPTY_DRAFT = { title: "", body: "" };

/**
 * 記録の入力フォームの状態と操作（記録ページ・履歴ページで共通）。
 * dateKey の日付に対して追加・編集・削除を行う。
 */
export function useEntryEditor(dateKey, { saveEntry, deleteEntry }) {
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState(null);
  const [message, flash] = useFlashMessage();

  const reset = () => {
    setDraft(EMPTY_DRAFT);
    setEditingId(null);
  };

  // 編集中に日付が変わったら編集を解除する（編集中の記録は前の日付のものなので）
  const [prevDateKey, setPrevDateKey] = useState(dateKey);
  if (dateKey !== prevDateKey) {
    setPrevDateKey(dateKey);
    if (editingId) reset();
  }

  return {
    draft,
    isEditing: editingId !== null,
    message,

    setField: (name, value) => setDraft((d) => ({ ...d, [name]: value })),

    startEdit(item) {
      setDraft({ title: item.title ?? "", body: item.body ?? "" });
      setEditingId(item.id);
      flash("編集モード", { persist: true });
    },

    cancel() {
      reset();
      flash("編集をキャンセルしました");
    },

    submit() {
      const title = draft.title.trim();
      const body = draft.body.trim();
      if (!title) return flash("タイトルは必須です");
      if (!body) return flash("学習メモは必須です");

      saveEntry(dateKey, { id: editingId, title, body });
      flash(editingId ? "更新しました" : "保存しました");
      reset();
    },

    remove(item) {
      if (!window.confirm("この記録を削除しますか？")) return;
      deleteEntry(dateKey, item.id);
      if (item.id === editingId) reset();
      flash("削除しました");
    },
  };
}
