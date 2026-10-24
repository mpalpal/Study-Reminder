# Study Reminder — 開発メモ（Claude 向け）

友人数人で使う学習記録・復習 PWA。データは端末の localStorage が基本で、任意で端末間同期（Cloudflare D1）。
オーナーは日本語話者。UI 文言・コメント・説明は日本語で書く。

## 最重要：データ互換性

- 保存キーは `studyLogsV2`（`src/lib/storage.js`）。変更しないこと。
- データ形式：`{ "YYYY-MM-DD": { items: [{ id, title, body, createdAt, updatedAt, reviews? }] } }`
  - items は新しい順。
  - `reviews`（任意）：復習チェック。`{ "1": 時刻, "7": 時刻, "14": 時刻 }`。キーは復習タイミング。
    チェックしても updatedAt は変えない。全部外したら項目ごと消す。
  - 項目を追加するのは可。ただし「その項目がない古いデータ」でも動くようにする。
  - 既存項目の削除・改名・意味の変更はしない。
- バックアップ JSON は `{ app: "StudyLog", version: 1, exportedAt, storageKey, data }`。
  過去に書き出したファイルを必ず読み込めること（`src/lib/logs.test.js` にテストあり）。
- 本番 URL（オリジン）が変わると localStorage は引き継がれない。

## 構成

- `src/lib/` 画面に依存しない純粋な関数（日付・記録データ操作・保存・バックアップ）。テストはここに置く。
- `src/hooks/` 状態管理。`useStudyLogs`（データ本体）、`useToday`（日付の自動更新）、
  `useEntryEditor`（記録/履歴ページ共通の入力フォーム）。
- `src/components/`, `src/pages/` 表示。3 ページは常に描画し `hidden` で切り替える（入力途中の内容を保持するため）。
- 復習タイミング（1・7・14日）は `src/lib/reviews.js` の `REVIEW_STAGES` が唯一の定義。
- 画面の文言はすべて `src/i18n/ja.js` と `en.js` に置き、`const { t } = useI18n()` → `t("キー")` で使う。
  コンポーネントに日本語を直書きしない。キーを足したら両方に足す（テストで確認）。
  記録の内容（タイトル・メモ）は翻訳しない。`src/lib/` は文言を持たず、エラーは code で返す。
- 設定は `studyReminderSettings` キーに別保存（`useSettings`）。バックアップには含めない。
- 同期（`src/lib/sync/` と `functions/api/sync.js`）
  - 同期キー（24 文字）から HKDF で「認証トークン」と「AES-GCM 暗号鍵」を作る。サーバーには暗号文と
    id・version（変更時刻）・deleted しか送らない。サーバーはトークンの SHA-256 をスペース ID にする。
  - 記録 1 件単位で、version が新しい方を残す。削除は deleted の行として残す。
  - 変更は `useStudyLogs` の commit → `engine.recordChanges` で pending に積み、自動で送る。
    ほかの端末からの取り込みは `applyLogs`（pending に積まない）。
  - 同期の状態は `studyReminderSync` キーに保存（バックアップには含めない）。
  - D1 は Pages の Bindings で変数名 `DB`。テーブルは API が初回に自動作成する。
- 日付は "YYYY-MM-DD" 文字列で扱い、Date を作るときは正午にする（`src/lib/dates.js`）。

## 作業の流れ

- 変更はブランチ → PR。Cloudflare Pages がブランチごとにプレビュー URL を発行し、オーナーが iPhone で確認してからマージする。
- 提出前に `npm test` と `npm run build` を通す。見た目を変えたら iPhone サイズ（390px 幅）で画面を確認する。
- 依存は最小限に。フレームワークや状態管理ライブラリを安易に追加しない。

## 今後の予定（オーナーの希望）

- ホーム画面アイコンの変更は、iOS の制約で現実的でないため見送り
