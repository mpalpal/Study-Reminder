# AWS 側（ログインと同期）の構築手順

アプリのログインと端末間の同期は、AWS の次のサービスで動いています。

| 役割 | サービス | 料金 |
|---|---|---|
| ログイン（ユーザー名とパスワード） | Amazon Cognito | 月 1 万ユーザーまで期限なしで無料 |
| 同期 API | AWS Lambda（関数 URL） | 月 100 万回まで期限なしで無料 |
| 記録の保存 | Amazon DynamoDB | 25GB・読み書き各 25 まで期限なしで無料 |

構成はすべて `template.yaml`（AWS SAM）に書いてあり、コマンド 1 つで作れます。
アプリ本体の公開は、これまでどおり Cloudflare Pages です。

---

## 1. 予算アラートを設定する（最初に 1 回・5 分）

万一料金が発生したらすぐ気づけるようにします。

1. AWS コンソール上部の検索欄で「Budgets」と入力して開く
2. 「予算を作成」→ テンプレートで **「ゼロ支出予算」（Zero spend budget）** を選ぶ
3. 通知先のメールアドレスを入れて作成

1 セントでも請求が発生するとメールが届きます。

## 2. リージョンを選ぶ

コンソール右上のリージョンを **アジアパシフィック（東京）ap-northeast-1** にします。
（ほかのリージョンでも動きます。以降は選んだリージョンで作業してください）

## 3. CloudShell で構築する（10〜15 分）

1. コンソール上部の `>_` アイコン（CloudShell）を押す。ブラウザの中にコマンド画面が開きます
2. 次の 3 行を 1 行ずつ貼り付けて実行する

```bash
git clone -b feature/cognito https://github.com/mpalpal/Study-Reminder.git
cd Study-Reminder/aws
sam deploy --guided
```

3. いくつか質問されるので、次のように答える（`Enter` だけのところは初期値のまま）

| 質問 | 答え |
|---|---|
| Stack Name | `study-reminder` |
| AWS Region | `ap-northeast-1`（手順 2 で選んだもの） |
| Parameter TableCapacity | `Enter`（25 のまま） |
| Confirm changes before deploy | `y` |
| Allow SAM CLI IAM role creation | `y` |
| Disable rollback | `n` |
| Save arguments to configuration file | `y` |
| SAM configuration file / environment | `Enter` |

4. 「Deploy this changeset?」と聞かれたら `y`
5. 数分待つと `Successfully created/updated stack` と表示され、最後に **Outputs** が出ます

```
Key    Region             Value  ap-northeast-1
Key    UserPoolClientId   Value  xxxxxxxxxxxxxxxxxxxxxxxxxx
Key    SyncUrl            Value  https://xxxxxxxx.lambda-url.ap-northeast-1.on.aws/
Key    UserPoolId         Value  ap-northeast-1_xxxxxxxxx
```

この **Region・UserPoolClientId・SyncUrl** の 3 つを、アプリの `src/config.js` に設定します。
（どれもパスワードのような秘密の値ではないので、そのまま共有して大丈夫です）

## 4. あとから変更を反映するとき

`template.yaml` や Lambda のコードを変えたら、CloudShell で次を実行します（質問はされません）。

```bash
cd ~/Study-Reminder && git pull && cd aws && sam deploy
```

---

## 運用メモ

### パスワードを忘れたユーザーがいたら
メールアドレスを登録していないので、管理者が再設定します。

1. コンソールで「Cognito」→ ユーザープール `study-reminder-users` → 「ユーザー」
2. 該当ユーザーを選び、「パスワードをリセット」ではなく **「アクション → パスワードを設定」** で新しいパスワードを決めて伝える

### 料金について
- 5 人程度の利用なら、すべて無料枠に収まります
- DynamoDB の無料枠（読み書き各 25）はアカウント全体での合計です。ほかにも DynamoDB を使う場合は、
  `sam deploy --guided` で `TableCapacity` を下げてください
- 2025 年 7 月以降に作った AWS アカウントで「無料プラン」を選んでいる場合、6 か月後に「有料プラン」への
  切り替えが必要です（切り替えても、上の無料枠の範囲なら請求は 0 円です）

### データの場所
DynamoDB のテーブル `study-reminder-items` に、ユーザーごと・記録 1 件ごとに保存されています。
スタックを削除してもテーブルは残る設定です（誤ってデータを消さないため）。

### ローカルでのテスト
AWS を使わずに、手元で同じ動きを再現してテストできます（Cognito の代わりと DynamoDB 互換のデータベースを使う）。

```bash
npm test   # aws/test/ のテストも含む
```
