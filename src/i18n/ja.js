// 日本語の文言。キーは en.js と同じものをそろえること（テストで確認している）。
// 値は文字列（{name} の部分が差し込まれる）、関数、配列のいずれか。

export default {
  "tabs.review": "復習",
  "tabs.record": "記録",
  "tabs.history": "履歴",
  "header.help": "使い方",
  "header.settings": "設定",

  "common.untitled": "(無題)",
  "common.empty": "記録なし",
  "common.delete": "削除",
  "common.close": "閉じる",

  "day.today": "今日",
  "day.daysAgo": ({ n }) => `${n}日前`,
  "stage.1": "昨日",
  "stage.7": "1週間前",
  "stage.14": "2週間前",

  "review.headingNamed": "{name}（{date}）",
  "review.headingDaysAgo": ({ date, n }) => `${date}（${n}日前）`,
  "review.progress": "{done}/{total} 復習済み",
  "review.markReviewed": "{title} を復習済みにする",
  "review.reviewed": "（復習済み）",
  "review.notReviewed": "（未復習）",
  "review.past": "▶︎過去の学習",
  "review.date": "日付",

  "record.heading": "今日の記録",
  "record.listHeading": "今日の学習",

  "form.title": "タイトル",
  "form.body": "学習メモ",
  "form.titlePlaceholder": "例：財務会計論 X章",
  "form.bodyPlaceholder": "例：問2は特に要復習",
  "form.save": "保存",
  "form.add": "追加",
  "form.update": "更新",
  "form.cancelEdit": "編集を中止",

  "editor.editing": "編集モード",
  "editor.canceled": "編集をキャンセルしました",
  "editor.titleRequired": "タイトルは必須です",
  "editor.bodyRequired": "学習メモは必須です",
  "editor.saved": "保存しました",
  "editor.updated": "更新しました",
  "editor.deleted": "削除しました",
  "editor.confirmDelete": "この記録を削除しますか？",

  "history.heading": "学習履歴",
  "history.prevMonth": "前の月",
  "history.thisMonth": "今月",
  "history.nextMonth": "次の月",
  "history.showing": "表示中：{month}",
  "history.weekdays": ["日", "月", "火", "水", "木", "金", "土"],
  "history.legend": "※ 学習記録がある日はピンクで表示",
  "history.recordsOf": "{date} の記録",
  "history.formHeading": "編集 / 追加",
  "history.editingOn": "編集中：{date}",
  "history.addingTo": "追加先：{date}",

  "settings.title": "設定",
  "settings.language": "表示言語",
  "settings.languageAuto": "自動（端末の言語に合わせる）",

  "backup.heading": "バックアップ (JSON)",
  "backup.hint": "記録はこの端末の中だけに保存されています。書き出したファイルは iCloud Drive などに保存してください。",
  "backup.export": "エクスポート",
  "backup.import": "インポート",
  "backup.wipe": "記録削除",
  "backup.exported": "エクスポートしました（ファイルに保存してください）",
  "backup.confirmImport": "インポートすると、今のデータは上書きされます。続行しますか？\n（不安なら先にエクスポートしてください）",
  "backup.imported": "インポートしました",
  "backup.importFailed": "インポート失敗: {reason}",
  "backup.confirmWipe": "本当に全データを削除しますか？\n（先にエクスポート推奨）",
  "backup.wiped": "全削除しました",

  "backupError.invalidJson": "JSON形式が不正です",
  "backupError.noData": "data が見つかりません",
  "backupError.badStructure": "データ構造が不正です",
  "backupError.badDateKey": "日付キーが不正です（{dateKey}）",
  "backupError.noItems": "items 配列が見つかりません（{dateKey}）",
  "backupError.unknown": "ファイルを読み込めませんでした",

  "help.title": "使い方",
  "help.sections": [
    {
      title: "復習ページ",
      body: [
        "「昨日」「1週間前」「2週間前」に記録した学習タイトルが表示されます。タイトルをタップすると、その下に学習メモが開きます。",
        "復習が終わったら、右の丸いボタンで「復習済み」のチェックを付けましょう。チェックはタイミングごとに記録され、前のタイミングでチェックしたかどうかもタイトルの下に表示されます。",
        "「過去の学習」では、今日〜30日前の記録とチェック状況を確認できます。",
      ],
    },
    {
      title: "記録ページ",
      body: [
        "今日の学習を「タイトル」と「学習メモ」で記録します。登録した記録はタイトルをタップすると編集、「削除」で削除できます。",
      ],
    },
    {
      title: "履歴ページ",
      body: [
        "カレンダーで過去の学習を確認できます。ピンクの日は記録がある日です。日付をタップするとその日の記録が表示され、編集や、記録し忘れた日への追加もできます。",
      ],
    },
    {
      title: "設定（歯車ボタン）",
      body: [
        "表示言語の切り替えと、データのバックアップができます。言語は最初、端末の言語設定に合わせて表示されます。",
        "記録データはこの端末のブラウザ内だけに保存され、ほかの人に見られることはありません。そのぶん、ほかの端末とは同期されないので、機種変更やバックアップには JSON のエクスポート・インポートを使ってください。",
      ],
    },
    {
      title: "おすすめの使い方",
      body: [
        "朝：アプリを開いて、その日の復習内容を確認する",
        "夜：その日の学習を記録する",
        "ときどき：念のためバックアップを取る",
        "通知は来ません。ネット接続がなくても使えます。",
      ],
    },
    {
      title: "アプリとして使うには",
      body: ["Safari で開き、共有 →「ホーム画面に追加」（Mac は「Dock に追加」）を選んでください。"],
    },
  ],
};
