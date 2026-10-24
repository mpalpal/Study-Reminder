import { useState } from "react";
import { useFlashMessage } from "./useFlashMessage.js";
import { useI18n } from "../i18n/I18nProvider.jsx";

const EMPTY_DRAFT = { title: "", body: "" };

/**
 * 記録の入力フォームの状態と操作（記録ページ・履歴ページで共通）。
 * dateKey の日付に対して追加・編集・削除を行う。
 */
export function useEntryEditor(dateKey, { saveEntry, deleteEntry }) {
  const { t } = useI18n();
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
      flash(t("editor.editing"), { persist: true });
    },

    cancel() {
      reset();
      flash(t("editor.canceled"));
    },

    submit() {
      const title = draft.title.trim();
      const body = draft.body.trim();
      if (!title) return flash(t("editor.titleRequired"));
      if (!body) return flash(t("editor.bodyRequired"));

      saveEntry(dateKey, { id: editingId, title, body });
      flash(t(editingId ? "editor.updated" : "editor.saved"));
      reset();
    },

    remove(item) {
      if (!window.confirm(t("editor.confirmDelete"))) return;
      deleteEntry(dateKey, item.id);
      if (item.id === editingId) reset();
      flash(t("editor.deleted"));
    },
  };
}
