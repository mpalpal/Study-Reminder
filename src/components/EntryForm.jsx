import { useId } from "react";
import { useI18n } from "../i18n/I18nProvider.jsx";

/** 記録の入力フォーム（記録ページ・履歴ページで共通）。状態は useEntryEditor が持つ。 */
export default function EntryForm({ heading, subtitle, addLabel, editor }) {
  const { t } = useI18n();
  const id = useId();
  const { draft, setField, isEditing, message, submit, cancel } = editor;

  return (
    <div className="card">
      <h2>{heading}</h2>
      <p className="muted">{subtitle}</p>

      <div className="field">
        <label className="label" htmlFor={`${id}-title`}>
          {t("form.title")}
        </label>
        <input
          id={`${id}-title`}
          className="input"
          placeholder={t("form.titlePlaceholder")}
          value={draft.title}
          onChange={(e) => setField("title", e.target.value)}
        />
      </div>

      <div className="field">
        <label className="label" htmlFor={`${id}-body`}>
          {t("form.body")}
        </label>
        <textarea
          id={`${id}-body`}
          className="textarea"
          placeholder={t("form.bodyPlaceholder")}
          value={draft.body}
          onChange={(e) => setField("body", e.target.value)}
        />
      </div>

      <div className="row">
        <button type="button" onClick={submit}>
          {isEditing ? t("form.update") : addLabel}
        </button>
        {isEditing && (
          <button type="button" className="secondary" onClick={cancel}>
            {t("form.cancelEdit")}
          </button>
        )}
        <span className="msg">{message}</span>
      </div>
    </div>
  );
}
