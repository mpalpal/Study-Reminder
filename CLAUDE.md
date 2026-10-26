# Study Reminder — 開発メモ（Claude 向け）

友人数人で使う学習記録・復習 PWA。データは端末の localStorage が基本で、ログインすると AWS に保存・端末間同期。
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
- ログインと同期（AWS。構成は `aws/template.yaml`、手順は `aws/README.md`）
  - Cognito：ユーザー名＋パスワード、誰でも新規登録可（PreSignUp トリガーで自動確認）、メールなし。
    リフレッシュトークン 10 年で「ログアウトしない限りログインしたまま」。クライアントは SDK を使わず fetch で
    SignUp / InitiateAuth / RevokeToken を呼ぶ（`src/lib/auth/`）。ログイン状態は `studyReminderAuth` に保存。
  - 同期 API：Lambda 関数 URL（API Gateway は無料枠が期限付きなので使わない）。アクセストークンを
    Web Crypto で検証し、`sub` をユーザー ID にする（`aws/functions/sync/`）。
  - DynamoDB：1 行 = 記録 1 件（userId + itemId）。PROVISIONED 25/25 で期限なし無料枠に収める。
    ユーザーごとの通し番号（`#meta` 行の counter）で差分を返す。書き込み中の端末がいる間は cursor を進めない。
  - 記録 1 件単位で version（変更時刻）が新しい方を残す。削除は deleted の行として残す。
  - 変更は `useStudyLogs` の commit → `engine.recordChanges` で pending に積み、自動で送る。
    ほかの端末からの取り込みは `applyLogs`（pending に積まない）。同期の状態は `studyReminderSync` に保存。
  - ログイン時：端末の記録をすべて送ってマージ。ログアウト時：端末の記録を消す（アカウントには残る）。
  - 接続先は `src/config.js`。空なら「アカウント」欄は表示されない。
  - テスト：`aws/test/` で Cognito の代わり＋dynalite（DynamoDB 互換）＋本物の Lambda handler を動かす。
- 日付は "YYYY-MM-DD" 文字列で扱い、Date を作るときは正午にする（`src/lib/dates.js`）。

## 作業の流れ

- 変更はブランチ → PR。Cloudflare Pages がブランチごとにプレビュー URL を発行し、オーナーが iPhone で確認してからマージする。
- 提出前に `npm test` と `npm run build` を通す。見た目を変えたら iPhone サイズ（390px 幅）で画面を確認する。
- 依存は最小限に。フレームワークや状態管理ライブラリを安易に追加しない。

## 今後の予定（オーナーの希望）

- ホーム画面アイコンの変更は、iOS の制約で現実的でないため見送り
