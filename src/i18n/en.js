// English strings. Keep the keys identical to ja.js (checked by a test).

const plural = (n, one, many) => (n === 1 ? one : many);

export default {
  "tabs.review": "Review",
  "tabs.record": "Record",
  "tabs.history": "History",
  "header.help": "How to use",
  "header.settings": "Settings",

  "common.untitled": "(Untitled)",
  "common.empty": "No records",
  "common.delete": "Delete",
  "common.close": "Close",

  "day.today": "Today",
  "day.daysAgo": ({ n }) => plural(n, "1 day ago", `${n} days ago`),
  "stage.1": "Yesterday",
  "stage.7": "1 week ago",
  "stage.14": "2 weeks ago",

  "review.headingNamed": "{name} ({date})",
  "review.headingDaysAgo": ({ date, n }) => `${date} (${plural(n, "1 day ago", `${n} days ago`)})`,
  "review.progress": "{done}/{total} reviewed",
  "review.markReviewed": "Mark {title} as reviewed",
  "review.reviewed": " (reviewed)",
  "review.notReviewed": " (not reviewed)",
  "review.past": "▶︎Past study",
  "review.date": "Date",

  "record.heading": "Today's record",
  "record.listHeading": "Studied today",

  "form.title": "Title",
  "form.body": "Study notes",
  "form.titlePlaceholder": "e.g. Financial Accounting, Chapter X",
  "form.bodyPlaceholder": "e.g. Review Q2 again",
  "form.save": "Save",
  "form.add": "Add",
  "form.update": "Update",
  "form.cancelEdit": "Cancel editing",

  "editor.editing": "Editing",
  "editor.canceled": "Editing canceled",
  "editor.titleRequired": "Title is required",
  "editor.bodyRequired": "Study notes are required",
  "editor.saved": "Saved",
  "editor.updated": "Updated",
  "editor.deleted": "Deleted",
  "editor.confirmDelete": "Delete this record?",

  "history.heading": "Study history",
  "history.prevMonth": "Previous month",
  "history.thisMonth": "This month",
  "history.nextMonth": "Next month",
  "history.showing": "Showing: {month}",
  "history.weekdays": ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  "history.legend": "* Days with records are shown in pink",
  "history.recordsOf": "Records on {date}",
  "history.formHeading": "Edit / Add",
  "history.editingOn": "Editing: {date}",
  "history.addingTo": "Add to: {date}",

  "settings.title": "Settings",
  "settings.language": "Language",
  "settings.languageAuto": "Automatic (device language)",

  "backup.heading": "Backup (JSON)",
  "backup.hint": "Your records are stored only on this device. Save the exported file somewhere safe, such as iCloud Drive.",
  "backup.export": "Export",
  "backup.import": "Import",
  "backup.wipe": "Delete all",
  "backup.exported": "Exported (save the file)",
  "backup.confirmImport": "Importing will overwrite your current data. Continue?\n(Export first if you're unsure.)",
  "backup.imported": "Imported",
  "backup.importFailed": "Import failed: {reason}",
  "backup.confirmWipe": "Really delete all data?\n(Exporting first is recommended.)",
  "backup.wiped": "All data deleted",

  "backupError.invalidJson": "The file is not valid JSON",
  "backupError.noData": "No data found in the file",
  "backupError.badStructure": "Invalid data structure",
  "backupError.badDateKey": "Invalid date key ({dateKey})",
  "backupError.noItems": "Missing items list ({dateKey})",
  "backupError.unknown": "Could not read the file",

  "help.title": "How to use",
  "help.sections": [
    {
      title: "Review",
      body: [
        "Shows the titles you recorded yesterday, 1 week ago and 2 weeks ago. Tap a title to open its study notes below it.",
        "When you finish reviewing, tap the round button on the right to mark it as reviewed. Checks are kept separately for each timing, and the checks from earlier timings are shown under the title.",
        "Open “Past study” to see records and check status from today back to 30 days ago.",
      ],
    },
    {
      title: "Record",
      body: [
        "Record what you studied today with a title and study notes. Tap a saved title to edit it, or “Delete” to remove it.",
      ],
    },
    {
      title: "History",
      body: [
        "Browse past study in the calendar. Days in pink have records. Tap a day to see its records, edit them, or add a record for a day you forgot.",
      ],
    },
    {
      title: "Settings (gear button)",
      body: [
        "Change the display language and back up your data. The language follows your device setting at first.",
        "Your records are stored only in this device's browser, so nobody else can see them. They are not synced to other devices either — use JSON export / import when you switch devices or want a backup.",
      ],
    },
    {
      title: "Suggested routine",
      body: [
        "Morning: open the app and check what to review",
        "Evening: record what you studied",
        "Now and then: export a backup",
        "There are no notifications. The app works offline.",
      ],
    },
    {
      title: "Using it as an app",
      body: ["Open it in Safari, then Share → “Add to Home Screen” (on Mac, “Add to Dock”)."],
    },
  ],
};
