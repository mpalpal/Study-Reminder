# Study Reminder

## 概要

「毎日の学習を記録し、適切なタイミングで復習できる」ことを目的とした個人利用向けの学習管理Webアプリ(PWA)です。  
エビングハウスの忘却曲線から発想を得ており、効率的な学習をサポートすることを期待しています。

実際に iPhone / iPad / MacBook で日常的に使うことを想定して設計・開発しました。

Study Reminder is a **personal learning management web application (PWA)** designed to help users record daily learning activities and review them at optimal timings.

The concept is inspired by **Ebbinghaus Forgetting Curve**, aiming to support efficient learning by encouraging review at appropriate intervals.

This application is designed and developed for **daily use on iPhone / iPad / MacBook, with a focus on simplicity, usability, and offline availability.

---

## アプリ利用
**Web (PWA対応): *https://58712e0c.study-reminder.pages.dev***

Safari で URL を開き、共有 → 「ホーム画面に追加」/「Dockに追加」することでアプリとして利用できます。

---

## 開発目的

- 学習内容を「毎日簡単に」記録したい
- 昨日・1週間前・2週間前など、**復習すべき内容を自然に確認したい**
- 通知に依存せず、**朝と夜に自分で開く学習習慣**を作りたい
- 広告や課金のない、**完全に個人データだけで完結するアプリ**にしたい

これらを満たすため、サーバーを使用しないクライアントサイド完結型設計を採用しました。

---

## 主な機能

### 復習ページ
- 昨日 / 1週間前 / 2週間前の学習内容を固定表示
- 任意の日付（当日〜30日前）を選択して復習可能
- 学習タイトルをタップすると学習メモを表示
- 復習済みチェック（タイミングごとに記録し、前回のチェック状況も表示）

### 記録ページ
- 当日の学習内容を「タイトル＋学習メモ」で記録
- 記録済み内容の編集・削除

### 履歴ページ
- カレンダー形式で学習履歴を一覧表示
- 過去日付の学習記録を追加・編集可能（記録し忘れた日の後追い入力に対応）

### 設定（右上の歯車）
- 表示言語の切り替え（日本語 / English。初期値は端末の言語）
- 学習データを JSON 形式でエクスポート / インポート、全削除

### その他
- オフライン対応
- 右上「？」ボタンからアプリの使い方を確認可能

---

## 技術スタック

- React + Vite（JavaScript）
- localStorage（データ保存）
- vite-plugin-pwa（Service Worker の自動生成・オフライン対応）
- Vitest（単体テスト）
- Cloudflare Pages（デプロイ）

---

## ディレクトリ構成

```
index.html              エントリーポイント（スプラッシュ画面のみ静的に記述）
public/                 そのまま配信する画像（アイコン）
src/
  main.jsx              起動処理
  App.jsx               ヘッダー・タブ・3ページの切り替え
  styles.css            デザイン
  pages/                復習 / 記録 / 履歴 の各ページ
  components/           ページで使う部品（入力フォーム・一覧・カレンダー・バックアップ・ヘルプ）
  hooks/                状態管理（記録データ・設定・今日の日付・入力フォーム・メッセージ・URL）
  i18n/                 表示言語（ja.js / en.js の文言辞書と切り替えの仕組み）
  lib/                  画面に依存しない処理（日付計算・記録データ操作・保存・バックアップ）＋テスト
```

---

## 設計上の工夫

- **完全クライアントサイド設計**
  - 学習データは端末内にのみ保存され、外部に送信されない
- **UX を意識した状態管理**
  - 編集モードの明示、誤操作防止
- **日付管理の安定性**
  - iOS の日付ズレを考慮した Date 操作
- **PWA 設計**
  - ホーム画面追加、オフライン起動対応

---

## 使い方

- 朝：復習ページで学習内容を確認
- 夜：記録ページでその日の学習を記録
- 定期的に：念の為 JSON 形式でバックアップを取得

---

## 注意事項

- 学習データは端末内（ブラウザ）に保存されます
- URL を知っている他人が学習内容を見ることはできません (プライバシー保護)
- 別端末間での自動同期は行われません（手動インポートのみ）

---

## ローカルでの起動方法

Node.js 22 以上が必要です。

```bash
git clone https://github.com/mpalpal/study-reminder.git
cd study-reminder
npm install
npm run dev      # 開発サーバー（http://localhost:5173）
npm test         # 単体テスト
npm run build    # 本番用ビルド（dist/ に出力）
```

## デプロイ（Cloudflare Pages）

| 設定 | 値 |
|---|---|
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | （空欄） |

Node のバージョンは `.node-version` で指定しています。
