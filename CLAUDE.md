# Study Reminder — 開発メモ（Claude 向け）

個人用の学習記録・復習 PWA。サーバーなし、データは端末の localStorage のみ。
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
- 日付は "YYYY-MM-DD" 文字列で扱い、Date を作るときは正午にする（`src/lib/dates.js`）。

## 作業の流れ

- 変更はブランチ → PR。Cloudflare Pages がブランチごとにプレビュー URL を発行し、オーナーが iPhone で確認してからマージする。
- 提出前に `npm test` と `npm run build` を通す。見た目を変えたら iPhone サイズ（390px 幅）で画面を確認する。
- 依存は最小限に。フレームワークや状態管理ライブラリを安易に追加しない。

## 今後の予定（オーナーの希望）

- アプリ内の設定でホーム画面アイコンを自由に変えられるようにする
- 表示言語の切り替え（まずは英語）。UI 文言をまとめて辞書化する必要あり
