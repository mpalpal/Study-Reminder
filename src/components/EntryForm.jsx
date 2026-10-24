import { useId } from "react";

/** 記録の入力フォーム（記録ページ・履歴ページで共通）。状態は useEntryEditor が持つ。 */
export default function EntryForm({ heading, subtitle, addLabel, editor }) {
  const id = useId();
  const { draft, setField, isEditing, message, submit, cancel } = editor;

  return (
    <div className="card">
      <h2>{heading}</h2>
      <p className="muted">{subtitle}</p>

      <div className="field">
        <label className="label" htmlFor={`${id}-title`}>
          タイトル
        </label>
        <input
          id={`${id}-title`}
          className="input"
          placeholder="例：財務会計論 X章"
          value={draft.title}
          onChange={(e) => setField("title", e.target.value)}
        />
      </div>

      <div className="field">
        <label className="label" htmlFor={`${id}-body`}>
          学習メモ
        </label>
        <textarea
          id={`${id}-body`}
          className="textarea"
          placeholder="例：問2は特に要復習"
          value={draft.body}
          onChange={(e) => setField("body", e.target.value)}
        />
      </div>

      <div className="row">
        <button type="button" onClick={submit}>
          {isEditing ? "更新" : addLabel}
        </button>
        {isEditing && (
          <button type="button" className="secondary" onClick={cancel}>
            編集を中止
          </button>
        )}
        <span className="msg">{message}</span>
      </div>
    </div>
  );
}
