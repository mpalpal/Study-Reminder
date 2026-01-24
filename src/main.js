// ===== データ構造 =====
// localStorage["studyLogsV2"] = {
//   "YYYY-MM-DD": {
//     items: [
//       { id, title, body, createdAt, updatedAt }
//     ]
//   }
// }

const STORAGE_KEY = "studyLogsV2";

// ===== Storage =====
function loadAll() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
  catch { return {}; }
}
function saveAll(obj) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
}

// ===== Date helpers =====
function formatDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function dateKeyMinus(days) {
  const d = new Date();
  d.setHours(12, 0, 0, 0); // 日付ズレ対策
  d.setDate(d.getDate() - days);
  return formatDateKey(d);
}
function todayKey() {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return formatDateKey(d);
}

// ===== CRUD =====
function ensureDay(all, key) {
  if (!all[key]) all[key] = { items: [] };
  if (!Array.isArray(all[key].items)) all[key].items = [];
  return all[key];
}
function getItems(key) {
  const all = loadAll();
  const day = all[key];
  return day?.items ? [...day.items] : [];
}
function upsertItem(key, item) {
  const all = loadAll();
  const day = ensureDay(all, key);
  const idx = day.items.findIndex((x) => x.id === item.id);
  if (idx >= 0) day.items[idx] = item;
  else day.items.unshift(item); // 新しい順
  saveAll(all);
}
function deleteItem(key, id) {
  const all = loadAll();
  const day = ensureDay(all, key);
  day.items = day.items.filter((x) => x.id !== id);
  saveAll(all);
}

// ===== Utils =====
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}
function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// ===== DOM =====
const $ = (id) => document.getElementById(id);

// pages/tabs
const pageReview = $("pageReview");
const pageRecord = $("pageRecord");
const tabReview = $("tabReview");
const tabRecord = $("tabRecord");

// review: fixed blocks + selectable block + detail
const fixed1Heading = $("fixed1Heading");
const fixed1List = $("fixed1List");
const fixed1Empty = $("fixed1Empty");

const fixed7Heading = $("fixed7Heading");
const fixed7List = $("fixed7List");
const fixed7Empty = $("fixed7Empty");

const fixed14Heading = $("fixed14Heading");
const fixed14List = $("fixed14List");
const fixed14Empty = $("fixed14Empty");

const offsetSelect = $("offsetSelect");
const setToTodayBtn = $("setToTodayBtn");

const reviewHeading = $("reviewHeading");
const reviewList = $("reviewList");
const reviewEmpty = $("reviewEmpty");

// record
const todayLabel = $("todayLabel");
const titleEl = $("title");
const bodyEl = $("body");
const saveBtn = $("saveBtn");
const cancelEditBtn = $("cancelEditBtn");
const msgEl = $("msg");
const todayList = $("todayList");
const todayEmpty = $("todayEmpty");

// backup
const exportBtn = $("exportBtn");
const importFile = $("importFile");
const wipeBtn = $("wipeBtn");
const backupMsg = $("backupMsg");

// history tab/page
const tabHistory = $("tabHistory");
const pageHistory = $("pageHistory");

const calPrevBtn = $("calPrevBtn");
const calNextBtn = $("calNextBtn");
const calTodayBtn = $("calTodayBtn");
const calMonthLabel = $("calMonthLabel");
const calendarEl = $("calendar");

const historyDateLabel = $("historyDateLabel");
const historyList = $("historyList");
const historyEmpty = $("historyEmpty");

const historyEditingInfo = $("historyEditingInfo");
const historyTitle = $("historyTitle");
const historyBody = $("historyBody");
const historySaveBtn = $("historySaveBtn");
const historyCancelBtn = $("historyCancelBtn");
const historyMsg = $("historyMsg");
const historyAddBtn = $("historyAddBtn");

// ===== Messages =====
function setMsg(text, persist = false) {
  if (!msgEl) return;
  msgEl.textContent = text;

  // 一時表示のときだけ自動で消す
  if (text && !persist) {
    setTimeout(() => (msgEl.textContent = ""), 2000);
  }
}

function setBackupMsg(text) {
  if (!backupMsg) return;
  backupMsg.textContent = text;
  if (text) setTimeout(() => (backupMsg.textContent = ""), 3000);
}

// ===== Routing (#review / #record) =====
function setActiveTab(hash) {
  const h = hash || "#review";
  const isReview = h !== "#record" && h !== "#history";
  const isRecord = h === "#record";
  const isHistory = h === "#history";

  if (pageReview) pageReview.style.display = isReview ? "" : "none";
  if (pageRecord) pageRecord.style.display = isRecord ? "" : "none";
  if (pageHistory) pageHistory.style.display = isHistory ? "" : "none";

  if (tabReview) tabReview.classList.toggle("active", isReview);
  if (tabRecord) tabRecord.classList.toggle("active", isRecord);
  if (tabHistory) tabHistory.classList.toggle("active", isHistory);
}

window.addEventListener("hashchange", () => {
  setActiveTab(location.hash);

  if (location.hash === "#record") {
    renderRecord();
  } else if (location.hash === "#history") {
    renderHistoryPage();
  } else {
    renderReview();
  }
});

// ===== Review page =====

// 今開いている「詳細表示」を1つだけ保持
let openedInline = null; // { node, ownerListId, ownerItemId }

function closeInline() {
  if (openedInline?.node) openedInline.node.remove();
  openedInline = null;
}

function buildInlineDetailNode(item, label) {
  const wrap = document.createElement("div");
  wrap.className = "inline-detail";
  wrap.innerHTML = `
    <div class="detail-title">${escapeHtml(item.title || "(無題)")}</div>
    <div class="detail-meta muted">${escapeHtml(label)}</div>
    <pre class="pre">${escapeHtml(item.body || "")}</pre>
  `;
  return wrap;
}

/**
 * key: 日付キー(YYYY-MM-DD)
 * listEl: ul要素
 * emptyEl: 「記録なし」要素
 * label: 見出し表示（例：昨日（2025-...））
 */
function renderReviewListFor(key, listEl, emptyEl, label) {
  const items = getItems(key);
  listEl.innerHTML = "";

  // 別のリストに切り替わったら、開いている詳細は閉じる
  if (openedInline && openedInline.ownerListId !== listEl.id) {
    closeInline();
  }

  if (!items.length) {
    emptyEl.style.display = "";
    return;
  }
  emptyEl.style.display = "none";

  for (const it of items) {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "list-btn";
    btn.textContent = it.title || "(無題)";
    btn.setAttribute("aria-expanded", "false");

    btn.addEventListener("click", () => {
      const isSame =
        openedInline &&
        openedInline.ownerListId === listEl.id &&
        openedInline.ownerItemId === it.id;

      // 同じ項目をもう一度押したら閉じる
      if (isSame) {
        closeInline();
        btn.setAttribute("aria-expanded", "false");
        return;
      }

      // 別の詳細が開いていたら閉じる
      closeInline();

      // 詳細を生成
      const detail = buildInlineDetailNode(it, label);

      // 「liの直後」に入れるため、詳細もliとして追加（ul構造を崩さない）
      const detailLi = document.createElement("li");
      detailLi.appendChild(detail);

      // タイトル行の真下に差し込む
      li.after(detailLi);

      openedInline = {
        node: detailLi,
        ownerListId: listEl.id,
        ownerItemId: it.id,
      };

      btn.setAttribute("aria-expanded", "true");

      // 画面外なら少しだけスクロールして見えるように（任意・便利）
      detail.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });

    li.appendChild(btn);
    listEl.appendChild(li);
  }
}

function labelFor(days, key) {
  // 表示を短く（あなたの希望に合わせて「/◯日前」を削除）
  if (days === 0) return `今日（${key}）`;
  if (days === 1) return `昨日（${key}）`;
  if (days === 7) return `1週間前（${key}）`;
  if (days === 14) return `2週間前（${key}）`;
  return `${key}（${days}日前）`;
}

function renderFixedBlock(days, headingEl, listEl, emptyEl) {
  const key = dateKeyMinus(days);
  const label = labelFor(days, key);
  headingEl.textContent = label;

  renderReviewListFor(key, listEl, emptyEl, label);
}

function buildOffsetOptions() {
  offsetSelect.innerHTML = "";
  for (let i = 0; i <= 30; i++) {
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = i === 0 ? "今日" : `${i}日前`;
    offsetSelect.appendChild(opt);
  }
  offsetSelect.value = "0";
}

function renderSelectableBlock() {
  const offset = Number(offsetSelect.value || "0");
  const key = dateKeyMinus(offset);
  const label = labelFor(offset, key);

  reviewHeading.textContent = label;

  renderReviewListFor(key, reviewList, reviewEmpty, label);
}

function renderReview() {
  // 復習ページを描画し直すたびに、開いていた詳細は閉じる
  closeInline();

  // 固定：昨日 / 7日前 / 14日前
  renderFixedBlock(1, fixed1Heading, fixed1List, fixed1Empty);
  renderFixedBlock(7, fixed7Heading, fixed7List, fixed7Empty);
  renderFixedBlock(14, fixed14Heading, fixed14List, fixed14Empty);

  // 選択：0〜30日前
  renderSelectableBlock();
}

if (offsetSelect) {
  offsetSelect.addEventListener("change", () => {
    closeInline();
    renderSelectableBlock();
  });
}
if (setToTodayBtn) {
  setToTodayBtn.addEventListener("click", () => {
    offsetSelect.value = "0";
    closeInline();
    renderSelectableBlock();
  });
}

// ===== Record page (today) =====
const TODAY = todayKey();
if (todayLabel) todayLabel.textContent = `${TODAY}`;

let editingId = null;

function resetForm() {
  editingId = null;
  if (titleEl) titleEl.value = "";
  if (bodyEl) bodyEl.value = "";
  if (cancelEditBtn) cancelEditBtn.style.display = "none";
  if (saveBtn) saveBtn.textContent = "保存";
}

function startEdit(item) {
  editingId = item.id;
  titleEl.value = item.title || "";
  bodyEl.value = item.body || "";
  cancelEditBtn.style.display = "";
  saveBtn.textContent = "更新";
  setMsg("編集モード", true);
  location.hash = "#record";
}

if (cancelEditBtn) {
  cancelEditBtn.addEventListener("click", () => {
    resetForm();
    setMsg("編集をキャンセルしました");
  });
}

function renderRecord() {
  const items = getItems(TODAY);
  todayList.innerHTML = "";
  todayEmpty.style.display = items.length ? "none" : "";

  for (const it of items) {
    const li = document.createElement("li");
    li.className = "list-row";

    const left = document.createElement("button");
    left.type = "button";
    left.className = "list-btn";
    left.textContent = it.title || "(無題)";
    left.addEventListener("click", () => startEdit(it));

    const del = document.createElement("button");
    del.type = "button";
    del.className = "danger";
    del.textContent = "削除";
    del.addEventListener("click", () => {
      if (!confirm("この記録を削除しますか？")) return;
      deleteItem(TODAY, it.id);
      if (editingId === it.id) resetForm();
      renderRecord();
      renderReview(); // 復習側にも反映
      setMsg("削除しました");
    });

    li.appendChild(left);
    li.appendChild(del);
    todayList.appendChild(li);
  }
}

if (saveBtn) {
  saveBtn.addEventListener("click", () => {
    const title = (titleEl.value || "").trim();
    const body = (bodyEl.value || "").trim();

    if (!title) { setMsg("タイトルは必須です"); return; }
    if (!body) { setMsg("学種メモは必須です"); return; }

    const now = Date.now();
    const existing = editingId ? getItems(TODAY).find(x => x.id === editingId) : null;

    const item = {
      id: editingId || uid(),
      title,
      body,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    upsertItem(TODAY, item);
    renderRecord();
    renderReview();
    resetForm();
    setMsg("保存しました");
  });
}

// ===== History page =====
let calCursor = new Date(); // 表示中の月
calCursor.setDate(1);
calCursor.setHours(12,0,0,0);

let selectedHistoryKey = null;
let historyEditingId = null;

function setHistoryMsg(t, persist = false) {
  if (!historyMsg) return;
  historyMsg.textContent = t;
  if (t && !persist) {
    setTimeout(() => (historyMsg.textContent = ""), 2000);
  } 
}

function keyToParts(key) {
  const [y,m,d] = key.split("-").map(Number);
  return { y, m, d };
}

function formatMonthLabel(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function dayKeyFromYMDay(y, m1, day) {
  const d = new Date(y, m1 - 1, day);
  d.setHours(12,0,0,0);
  return formatDateKey(d);
}

function hasRecordFor(key) {
  const items = getItems(key);
  return items.some(it => (it.title || "").trim() || (it.body || "").trim());
}

function renderCalendar() {
  if (!calendarEl) return;

  calendarEl.innerHTML = "";

  if (calMonthLabel) calMonthLabel.textContent = `表示中：${formatMonthLabel(calCursor)}`;

  const week = ["日","月","火","水","木","金","土"];
  for (const w of week) {
    const div = document.createElement("div");
    div.className = "cal-head";
    div.textContent = w;
    calendarEl.appendChild(div);
  }

  const first = new Date(calCursor);
  const y = first.getFullYear();
  const m0 = first.getMonth(); // 0-based
  const startDow = first.getDay();

  // その月の日数
  const last = new Date(y, m0 + 1, 0);
  const daysInMonth = last.getDate();

  // 前月の末尾を埋める
  const prevLast = new Date(y, m0, 0).getDate();
  for (let i = 0; i < startDow; i++) {
    const day = prevLast - (startDow - 1 - i);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cal-day is-out";
    btn.innerHTML = `<span class="n">${day}</span>`;
    // 前月のキー
    const key = formatDateKey(new Date(y, m0 - 1, day, 12));
    if (hasRecordFor(key)) btn.classList.add("has-record");
    if (selectedHistoryKey === key) btn.classList.add("is-selected");
    btn.addEventListener("click", () => selectHistoryDate(key));
    calendarEl.appendChild(btn);
  }

  // 当月
  for (let day = 1; day <= daysInMonth; day++) {
    const key = formatDateKey(new Date(y, m0, day, 12));
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cal-day";
    btn.innerHTML = `<span class="n">${day}</span>`;
    if (hasRecordFor(key)) btn.classList.add("has-record");
    if (selectedHistoryKey === key) btn.classList.add("is-selected");
    btn.addEventListener("click", () => selectHistoryDate(key));
    calendarEl.appendChild(btn);
  }

  // 翌月の頭を埋める（合計が 7の倍数になるまで）
  const totalCells = calendarEl.children.length - 7; // ヘッダ7を除く
  const rem = totalCells % 7;
  const need = rem === 0 ? 0 : 7 - rem;

  for (let day = 1; day <= need; day++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cal-day is-out";
    btn.innerHTML = `<span class="n">${day}</span>`;
    const key = formatDateKey(new Date(y, m0 + 1, day, 12));
    if (hasRecordFor(key)) btn.classList.add("has-record");
    if (selectedHistoryKey === key) btn.classList.add("is-selected");
    btn.addEventListener("click", () => selectHistoryDate(key));
    calendarEl.appendChild(btn);
  }
}

function selectHistoryDate(key) {
  selectedHistoryKey = key;
  historyEditingId = null;
  if (historyTitle) historyTitle.value = "";
  if (historyBody) historyBody.value = "";
  if (historyEditingInfo) historyEditingInfo.textContent = "日付とタイトルを選択して編集 / 日付を選択して追加";

  renderCalendar();
  renderHistoryList();
  updateHistoryEditorUI();
}

function renderHistoryList() {
  if (!historyList || !historyEmpty || !historyDateLabel) return;

  if (!selectedHistoryKey) {
    historyDateLabel.textContent = "日付を選択してください";
    historyList.innerHTML = "";
    historyEmpty.style.display = "none";
    return;
  }

  historyDateLabel.textContent = `${selectedHistoryKey} の記録`;
  const items = getItems(selectedHistoryKey);

  historyList.innerHTML = "";
  historyEmpty.style.display = items.length ? "none" : "";

  for (const it of items) {
    const li = document.createElement("li");
    li.className = "list-row";

    const left = document.createElement("button");
    left.type = "button";
    left.className = "list-btn";
    left.textContent = it.title || "(無題)";
    left.addEventListener("click", () => {
      historyEditingId = it.id;
      historyTitle.value = it.title || "";
      historyBody.value = it.body || "";
      if (historyEditingInfo) historyEditingInfo.textContent = `編集中：${selectedHistoryKey}`;
      setHistoryMsg("編集モード", true);
      updateHistoryEditorUI();
    });

    const del = document.createElement("button");
    del.type = "button";
    del.className = "danger";
    del.textContent = "削除";
    del.addEventListener("click", () => {
      if (!confirm("この記録を削除しますか？")) return;
      deleteItem(selectedHistoryKey, it.id);
      if (historyEditingId === it.id) {
        historyEditingId = null;
        historyTitle.value = "";
        historyBody.value = "";
      }
      renderHistoryList();
      renderCalendar();
      renderReview();
      if (selectedHistoryKey === TODAY) renderRecord();
      setHistoryMsg("削除しました");
    });

    li.appendChild(left);
    li.appendChild(del);
    historyList.appendChild(li);
  }
}

function renderHistoryPage() {
  // 初回は今日を選択しておく（好みで null のままでもOK）
  if (!selectedHistoryKey) selectedHistoryKey = TODAY;

  renderCalendar();
  renderHistoryList();
  updateHistoryEditorUI();
}

if (calPrevBtn) {
  calPrevBtn.addEventListener("click", () => {
    calCursor = new Date(calCursor.getFullYear(), calCursor.getMonth() - 1, 1, 12);
    renderCalendar();
  });
}
if (calNextBtn) {
  calNextBtn.addEventListener("click", () => {
    calCursor = new Date(calCursor.getFullYear(), calCursor.getMonth() + 1, 1, 12);
    renderCalendar();
  });
}
if (calTodayBtn) {
  calTodayBtn.addEventListener("click", () => {
    calCursor = new Date();
    calCursor.setDate(1);
    calCursor.setHours(12,0,0,0);
    renderCalendar();
  });
}

if (historySaveBtn) {
  historySaveBtn.addEventListener("click", () => {
    if (!selectedHistoryKey) { setHistoryMsg("日付を選んでください"); return; }
    if (!historyEditingId) { setHistoryMsg("編集するタイトルを選んでください"); return; }

    const title = (historyTitle.value || "").trim();
    const body = (historyBody.value || "").trim();
    if (!title) { setHistoryMsg("タイトルは必須です"); return; }
    if (!body) { setHistoryMsg("学習メモは必須です"); return; }

    const now = Date.now();
    const existing = getItems(selectedHistoryKey).find(x => x.id === historyEditingId);
    if (!existing) { setHistoryMsg("対象が見つかりません"); return; }

    const updated = {
      ...existing,
      title,
      body,
      updatedAt: now,
    };

    upsertItem(selectedHistoryKey, updated);
    setHistoryMsg("保存しました");
    renderHistoryList();
    renderCalendar();
    renderReview();
    if (selectedHistoryKey === TODAY) renderRecord();

    // 更新後は追加モードに戻す
    historyEditingId = null;
    if (historyTitle) historyTitle.value = "";
    if (historyBody) historyBody.value = "";

    // 状態表示も追加モードに
    if (historyEditingInfo) historyEditingInfo.textContent = `追加先：${selectedHistoryKey}`;

    // UI更新
    updateHistoryEditorUI();
  });
}

if (historyCancelBtn) {
  historyCancelBtn.addEventListener("click", () => {
    historyEditingId = null;

    if (historyTitle) historyTitle.value = "";
    if (historyBody) historyBody.value = "";

    if (historyEditingInfo) {
      historyEditingInfo.textContent = `追加先：${selectedHistoryKey}`;
    }

    setHistoryMsg("編集をキャンセルしました");
    updateHistoryEditorUI();
  });
}

if (historyAddBtn) {
  historyAddBtn.addEventListener("click", () => {
    if (!selectedHistoryKey) { setHistoryMsg("日付を選んでください"); return; }

    const title = (historyTitle.value || "").trim();
    const body = (historyBody.value || "").trim();
    if (!title) { setHistoryMsg("タイトルは必須です"); return; }
    if (!body) { setHistoryMsg("学習メモは必須です"); return; }

    const now = Date.now();
    const item = {
      id: uid(),
      title,
      body,
      createdAt: now,
      updatedAt: now,
    };

    upsertItem(selectedHistoryKey, item);
    setHistoryMsg("追加しました");

    // 画面更新
    historyEditingId = null;
    historyTitle.value = "";
    historyBody.value = "";
    if (historyEditingInfo) historyEditingInfo.textContent = `追加先：${selectedHistoryKey}`;

    renderHistoryList();
    renderCalendar();
    renderReview();
    if (selectedHistoryKey === TODAY) renderRecord();
    updateHistoryEditorUI();
  });
}

function updateHistoryEditorUI() {
  // selectedHistoryKey がある＝日付選択済み
  const hasDate = !!selectedHistoryKey;
  // historyEditingId がある＝タイトル選択済み（編集モード）
  const isEditing = !!historyEditingId;

  // 日付未選択なら全部隠す（基本は今日が初期選択なのでここは通らない想定）
  if (!hasDate) {
    if (historyAddBtn) historyAddBtn.style.display = "none";
    if (historySaveBtn) historySaveBtn.style.display = "none";
    if (historyCancelBtn) historyCancelBtn.style.display = "none";
    return;
  }

  if (!isEditing) {
    // 日付だけ選択：追加だけ表示
    if (historyAddBtn) historyAddBtn.style.display = "";
    if (historySaveBtn) historySaveBtn.style.display = "none";
    if (historyCancelBtn) historyCancelBtn.style.display = "none";
    if (historyEditingInfo) historyEditingInfo.textContent = `追加先：${selectedHistoryKey}`;
  } else {
    // 編集モード：更新＋編集をやめる
    if (historyAddBtn) historyAddBtn.style.display = "none";
    if (historySaveBtn) historySaveBtn.style.display = "";
    if (historyCancelBtn) historyCancelBtn.style.display = "";
    if (historyEditingInfo) historyEditingInfo.textContent = `編集中：${selectedHistoryKey}`;
  }
}

// ===== Init =====
setActiveTab(location.hash);

// backup: export
function exportJson() {
  const data = loadAll();
  const payload = {
    app: "StudyLog",
    version: 1,
    exportedAt: new Date().toISOString(),
    storageKey: STORAGE_KEY,
    data,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  const stamp = todayKey();
  a.href = url;
  a.download = `study-log-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
  setBackupMsg("エクスポートしました（ファイルに保存してください）");
}

if (exportBtn) {
  exportBtn.addEventListener("click", exportJson);
}

// backup: import
function validateImportedPayload(payload) {
  if (!payload || typeof payload !== "object") return { ok: false, error: "JSON形式が不正です" };
  if (!payload.data || typeof payload.data !== "object") return { ok: false, error: "data が見つかりません" };

  // dataの中身が { dateKey: { items:[...] } } っぽいか軽くチェック
  for (const [k, v] of Object.entries(payload.data)) {
    if (typeof k !== "string") return { ok: false, error: "日付キーが不正です" };
    if (!v || typeof v !== "object") return { ok: false, error: "データ構造が不正です" };
    if (!Array.isArray(v.items)) return { ok: false, error: "items 配列が見つかりません" };
  }
  return { ok: true };
}

function importJsonFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(String(reader.result || ""));
        const v = validateImportedPayload(payload);
        if (!v.ok) return reject(new Error(v.error));

        // 既存データを上書き（安全のため、事前にエクスポート推奨）
        saveAll(payload.data);
        resolve();
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(new Error("ファイルの読み込みに失敗しました"));
    reader.readAsText(file);
  });
}

if (importFile) {
  importFile.addEventListener("change", async () => {
    const file = importFile.files && importFile.files[0];
    if (!file) return;

    const ok = confirm("インポートすると、今のデータは上書きされます。続行しますか？\n（不安なら先にエクスポートしてください）");
    if (!ok) {
      importFile.value = "";
      return;
    }

    try {
      await importJsonFile(file);
      setBackupMsg("インポートしました");
      // 画面を再描画
      renderReview();
      renderRecord();
    } catch (e) {
      setBackupMsg(`インポート失敗: ${e.message || e}`);
    } finally {
      importFile.value = "";
    }
  });
}

// backup: wipe
if (wipeBtn) {
  wipeBtn.addEventListener("click", () => {
    const ok = confirm("本当に全データを削除しますか？\n（先にエクスポート推奨）");
    if (!ok) return;

    localStorage.removeItem(STORAGE_KEY);
    setBackupMsg("全削除しました");
    // 画面を再描画
    renderReview();
    renderRecord();
  });
}

// options生成（復習の選択：0〜14日前）
if (offsetSelect) buildOffsetOptions();

// 初回描画
if (location.hash === "#record") renderRecord();
else if (location.hash === "#history") renderHistoryPage();
else renderReview();

// Service Worker（キャッシュ用途のみ）
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/service-worker.js").catch(console.error);
}

// Splash screen (UI only)
window.addEventListener("load", () => {
  setTimeout(() => {
    const splash = document.getElementById("splash");
    if (splash) splash.classList.add("hide");
  }, 1000);
});

// ===== Help (PDF) =====
const helpBtn = document.getElementById("helpBtn");
const helpModal = document.getElementById("helpModal");
const helpClose = document.getElementById("helpClose");
const helpBackdrop = document.getElementById("helpBackdrop");

function openHelp() {
  if (!helpModal) return;
  helpModal.style.display = "block";
}
function closeHelp() {
  if (!helpModal) return;
  helpModal.style.display = "none";
}

if (helpBtn) helpBtn.addEventListener("click", openHelp);
if (helpClose) helpClose.addEventListener("click", closeHelp);
if (helpBackdrop) helpBackdrop.addEventListener("click", closeHelp);

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeHelp();
});