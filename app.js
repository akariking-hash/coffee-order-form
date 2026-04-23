const STORAGE_KEY = "coffeeOrderForm.v1";

const HISTORY_KEY = "coffeeOrderHistory.v1";

const DEFAULT_NAMES = [
  "유낙근 부장",
  "이병호 부장",
  "신승국 부장",
  "이경선 차장",
  "유재영 차장",
  "김샛별 차장",
  "신창근 차장",
  "김미진 차장",
  "이영실 과장",
  "윤주열 과장",
  "선대범 대리",
  "유석민 대리",
  "지서영 사원",
];

const MEMBER_COUNT = DEFAULT_NAMES.length;

const MENU_GROUPS = [
  {
    label: "COFFEE",
    items: [
      "아메리카노 시그니처",
      "아메리카노 다크",
      "카페라떼",
      "수제 바닐라빈 라떼",
      "연유 라떼",
      "헤이즐넛 라떼",
      "시나몬 라떼 (ONLY HOT)",
      "코코넛 라떼 (ONLY ICE)",
      "소소 라떼",
    ],
  },
  {
    label: "COLD BREW",
    items: ["콜드 브루", "콜드 브루 라떼", "연유 콜드 브루"],
  },
  {
    label: "SIGNATURE",
    items: [
      "소소슈페너 (ONLY ICE)",
      "달라비우트 초코 라떼",
      "달라비우트 카페 모카",
      "딸기 한사바리 라떼 (ONLY ICE)",
    ],
  },
  {
    label: "NON COFFEE",
    items: ["토피넛 라떼", "그린티 라떼", "미숫가루 라떼 (ONLY ICE)", "얼그레이 밀크티"],
  },
  {
    label: "ADE",
    items: [
      "레몬 에이드 (ONLY ICE)",
      "자몽 에이드 (ONLY ICE)",
      "청포도 에이드 (ONLY ICE)",
      "자두 자몽 히비스커스 에이드 (ONLY ICE)",
    ],
  },
  {
    label: "TEA",
    items: [
      "얼그레이 복숭아 아이스 티",
      "자두 자몽 히비스커스 티",
      "얼그레이",
      "캐모마일",
      "페퍼민트",
      "루이보스 카라멜 티",
    ],
  },
];

const MENU_SET = new Set(MENU_GROUPS.flatMap((g) => g.items));

function normalizeMenuValue(v) {
  const s = typeof v === "string" ? v.trim() : "";
  return MENU_SET.has(s) ? s : "";
}

function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory(history) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function makeInitialState() {
  return {
    members: Array.from({ length: MEMBER_COUNT }, (_, i) => ({
      name: DEFAULT_NAMES[i] ?? "",
      menu: "",
      temp: "",
      decaf: false,
      savedAt: null,
      index: i + 1,
    })),
  };
}

function normalizeState(state) {
  const initial = makeInitialState();
  if (!state) return initial;

  // 저장된 과거 데이터(13명 등)가 있어도, "현재 DEFAULT_NAMES" 기준으로 재정렬한다.
  // 이렇게 해야 명단에서 제거된 사람이 웹에서도 사라진다.
  const members = Array.isArray(state.members) ? state.members : [];
  const byName = new Map();
  for (const m of members) {
    if (!m || typeof m !== "object") continue;
    const name = typeof m.name === "string" ? m.name.trim() : "";
    if (!name) continue;
    if (!byName.has(name)) byName.set(name, m);
  }

  const fixed = initial.members.map((m, i) => {
    const src = byName.get(m.name) && typeof byName.get(m.name) === "object" ? byName.get(m.name) : {};
    const menu = normalizeMenuValue(src.menu);
    const hasMenu = Boolean(menu.trim());
    return {
      index: i + 1,
      // 이름은 "현재 명단"을 강제(고정 멤버)
      name: m.name,
      menu,
      temp: hasMenu && typeof src.temp === "string" ? src.temp : "",
      decaf: hasMenu ? Boolean(src.decaf) : false,
      savedAt: hasMenu && typeof src.savedAt === "string" ? src.savedAt : null,
    };
  });

  return { members: fixed };
}

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "dataset") Object.assign(node.dataset, v);
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else if (v === false || v == null) continue;
    else node.setAttribute(k, String(v));
  }
  for (const child of children) {
    node.append(child);
  }
  return node;
}

function buildMenuSelect(value, onChange) {
  const normalized = normalizeMenuValue(value);
  const hasValue = Boolean(normalized);
  const select = el(
    "select",
    {
      "aria-label": "메뉴 선택",
      onchange: onChange,
    },
    // 기본 문구는 보이되, 드롭다운 목록에서는 숨김 처리
    el(
      "option",
      { value: "", disabled: true, selected: !hasValue, hidden: true },
      "메뉴 선택해주세요.",
    ),
  );

  for (const group of MENU_GROUPS) {
    const optgroup = el("optgroup", { label: group.label });
    for (const item of group.items) {
      optgroup.append(el("option", { value: item }, item));
    }
    select.append(optgroup);
  }

  select.value = normalized;
  return select;
}

function buildTempToggle({ value, disabled, onPick }) {
  const iceBtn = el(
    "button",
    {
      type: "button",
      class: `temp-btn ${value === "ICE" ? "is-on" : ""}`,
      "aria-pressed": value === "ICE" ? "true" : "false",
      onclick: () => onPick("ICE"),
    },
    "ICE",
  );
  iceBtn.dataset.tempBtn = "ICE";

  const hotBtn = el(
    "button",
    {
      type: "button",
      class: `temp-btn ${value === "HOT" ? "is-on" : ""}`,
      "aria-pressed": value === "HOT" ? "true" : "false",
      onclick: () => onPick("HOT"),
    },
    "HOT",
  );
  hotBtn.dataset.tempBtn = "HOT";

  const wrap = el("div", { class: `temp-toggle ${disabled ? "is-disabled" : ""}` }, iceBtn, hotBtn);
  wrap.dataset.tempWrap = "1";

  if (disabled) {
    iceBtn.disabled = true;
    hotBtn.disabled = true;
  }

  return wrap;
}

function onlyTempFromMenu(menu) {
  if (typeof menu !== "string") return "";
  if (menu.includes("ONLY ICE")) return "ICE";
  if (menu.includes("ONLY HOT")) return "HOT";
  return "";
}

const rowsEl = document.getElementById("rows");
const historyBtn = document.getElementById("historyBtn");
const completeBtn = document.getElementById("completeBtn");
const unlockBtn = document.getElementById("unlockBtn");
const statusBadge = document.getElementById("statusBadge");
const toastEl = document.getElementById("toast");
const historyDialog = document.getElementById("historyDialog");
const historyCloseBtn = document.getElementById("historyCloseBtn");
const historySubtitle = document.getElementById("historySubtitle");
const historyBody = document.getElementById("historyBody");

let state = normalizeState(loadState());
saveState(state);

let toastTimer = null;
function showToast(message, ms = 2000) {
  if (!toastEl) return;
  if (toastTimer) window.clearTimeout(toastTimer);
  toastEl.textContent = message;
  toastEl.classList.add("is-on");
  toastTimer = window.setTimeout(() => {
    toastEl.classList.remove("is-on");
  }, ms);
}

// 입력 중인 메뉴(초안)는 저장 버튼 누르기 전까지 localStorage에 저장하지 않음
const drafts = new Map();
const draftTemps = new Map();
const draftDecaf = new Map();
for (let i = 0; i < state.members.length; i += 1) {
  const menu = state.members[i].menu || "";
  drafts.set(i, menu);
  draftTemps.set(i, menu.trim() ? state.members[i].temp || "" : "");
  draftDecaf.set(i, menu.trim() ? Boolean(state.members[i].decaf) : false);
}

function renderStatus() {
  statusBadge.classList.remove("is-locked");
  statusBadge.classList.add("is-unlocked");
  statusBadge.replaceChildren(
    el("span", { class: "status-dot", "aria-hidden": "true" }),
    el("span", {}, "편집 가능: 언제든 수정 가능 (주문완료 시 내역 저장)"),
  );
}

function updateMember(i, patch) {
  const next = { ...state.members[i], ...patch };
  state.members[i] = next;
  saveState(state);
}

function formatTime(iso) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  } catch {
    return "";
  }
}

function markSaved(i) {
  const draft = normalizeMenuValue(drafts.get(i) ?? "");
  if (!draft) return;
  const only = onlyTempFromMenu(draft);
  const tempDraft = only || String(draftTemps.get(i) ?? "").trim();
  if (!tempDraft) return;
  updateMember(i, {
    menu: draft,
    temp: tempDraft,
    decaf: Boolean(draftDecaf.get(i)),
    savedAt: new Date().toISOString(),
  });
  drafts.set(i, draft);
  draftTemps.set(i, tempDraft);
  draftDecaf.set(i, Boolean(draftDecaf.get(i)));
  renderRows();
  showToast("저장되었습니다", 2000);
}

function buildRow(member, i) {
  const nameInput = el("input", {
    type: "text",
    value: member.name,
    placeholder: `멤버 ${member.index} 이름`,
    "aria-label": `멤버 ${member.index} 이름`,
    oninput: (e) => updateMember(i, { name: e.target.value }),
  });

  const draftValue = String(drafts.get(i) ?? member.menu ?? "");
  const lockedOnly = onlyTempFromMenu(draftValue);
  const menuSelect = buildMenuSelect(draftValue, (e) => {
    const nextMenu = String(e.target.value || "");
    drafts.set(i, nextMenu);
    const only = onlyTempFromMenu(nextMenu);
    if (only) draftTemps.set(i, only);
    if (!nextMenu.trim()) {
      draftTemps.set(i, "");
      draftDecaf.set(i, false);
    }
    const btn = e.target.closest(".row")?.querySelector("button[data-save='1']");
    const tempOk = Boolean(only || String(draftTemps.get(i) ?? "").trim());
    if (btn) btn.disabled = !(nextMenu.trim() && tempOk);
    const wrap = e.target.closest(".row")?.querySelector("[data-temp-wrap='1']");
    if (wrap) {
      const disable = Boolean(only) || !nextMenu.trim();
      wrap.classList.toggle("is-disabled", disable);
      const ice = wrap.querySelector("button[data-temp-btn='ICE']");
      const hot = wrap.querySelector("button[data-temp-btn='HOT']");
      if (ice) ice.disabled = disable;
      if (hot) hot.disabled = disable;
      // 메뉴가 비어있으면 이전 temp가 남아있더라도 표시/선택을 제거
      const v = disable && !only ? "" : (only || String(draftTemps.get(i) ?? "")) || "";
      for (const b of [ice, hot]) {
        if (!b) continue;
        const isOn = b.dataset.tempBtn === v;
        b.classList.toggle("is-on", isOn);
        b.setAttribute("aria-pressed", isOn ? "true" : "false");
      }
    }

    const decafEl = e.target.closest(".row")?.querySelector("input[data-decaf='1']");
    if (decafEl) {
      decafEl.disabled = !nextMenu.trim();
      decafEl.checked = Boolean(draftDecaf.get(i));
    }
  });

  const tempDisabled = Boolean(lockedOnly) || !draftValue.trim();
  const tempValue = tempDisabled && !lockedOnly ? "" : lockedOnly || String(draftTemps.get(i) ?? member.temp ?? "");
  const tempToggle = buildTempToggle({
    value: tempValue,
    disabled: tempDisabled,
    onPick: (picked) => {
      const currentMenu = String(drafts.get(i) ?? "").trim();
      const currentOnly = onlyTempFromMenu(currentMenu);
      if (!currentMenu || currentOnly) return;
      draftTemps.set(i, picked);
      const row = tempToggle.closest(".row");
      if (!row) return;
      const ice = row.querySelector("button[data-temp-btn='ICE']");
      const hot = row.querySelector("button[data-temp-btn='HOT']");
      for (const b of [ice, hot]) {
        if (!b) continue;
        const isOn = b.dataset.tempBtn === picked;
        b.classList.toggle("is-on", isOn);
        b.setAttribute("aria-pressed", isOn ? "true" : "false");
      }

      const btn = row.querySelector("button[data-save='1']");
      if (btn) btn.disabled = !(Boolean(currentMenu) && Boolean(picked));
    },
  });

  const nameField = el(
    "div",
    { class: "field name-field" },
    el("span", { class: "index" }, String(member.index)),
    nameInput,
  );
  const menuField = el("div", { class: "field" }, menuSelect);
  const tempField = el("div", { class: "" }, tempToggle);

  const decafInput = el("input", {
    type: "checkbox",
    checked: Boolean(draftDecaf.get(i)),
    disabled: !draftValue.trim(),
  });
  decafInput.dataset.decaf = "1";
  decafInput.addEventListener("change", (e) => {
    draftDecaf.set(i, Boolean(e.target.checked));
  });
  const decafField = el(
    "div",
    { class: "field" },
    el("label", { class: "check" }, decafInput, el("span", { class: "check-text" }, "디카페인")),
  );

  const saveBtn = el(
    "button",
    {
      type: "button",
      class: "btn btn-primary btn-sm",
      onclick: () => markSaved(i),
      dataset: { save: "1" },
      disabled: !String(drafts.get(i) ?? "").trim() || !(lockedOnly || String(draftTemps.get(i) ?? "").trim()),
    },
    "저장",
  );

  const saveCell = el("div", { class: "save-cell" }, saveBtn);

  return el(
    "div",
    { class: "row", dataset: { idx: String(i) } },
    nameField,
    menuField,
    tempField,
    decafField,
    saveCell,
  );
}

function renderRows() {
  rowsEl.replaceChildren(...state.members.map(buildRow));
}

function pushHistoryBatch() {
  const now = new Date();
  const date = todayKey(now);
  const orders = state.members
    .map((m) => {
      const name = (m.name || "").trim();
      const menu = (m.menu || "").trim();
      const temp = (m.temp || "").trim();
      const only = onlyTempFromMenu(menu);
      const finalTemp = only || temp;
      const tempPart = finalTemp && !only ? ` (${finalTemp})` : "";
      const decafPart = m.decaf ? " (디카페인)" : "";
      const display = `${menu}${tempPart}${decafPart}`;
      return { name, menu: display.trim(), index: m.index };
    })
    .filter((o) => o.menu.length > 0);

  if (orders.length === 0) return false;

  const history = loadHistory();
  history.push({
    date,
    createdAt: now.toISOString(),
    orders,
  });
  saveHistory(history);
  return true;
}

function clearMenus() {
  state.members = state.members.map((m) => ({ ...m, menu: "", temp: "", decaf: false, savedAt: null }));
  saveState(state);
  for (let i = 0; i < state.members.length; i += 1) {
    drafts.set(i, "");
    draftTemps.set(i, "");
    draftDecaf.set(i, false);
  }
  renderRows();
}

function onComplete() {
  const saved = pushHistoryBatch();
  clearMenus();
  if (!saved) {
    statusBadge.replaceChildren(
      el("span", { class: "status-dot", "aria-hidden": "true" }),
      el("span", {}, "저장할 메뉴가 없어서 내역은 추가되지 않았어요. (메뉴가 있는 항목만 저장)"),
    );
    setTimeout(renderStatus, 1800);
  }
}

function groupHistoryByDate(history) {
  const map = new Map();
  for (const batch of history) {
    if (!batch || typeof batch !== "object") continue;
    const date = typeof batch.date === "string" ? batch.date : "";
    if (!date) continue;
    if (!map.has(date)) map.set(date, []);
    map.get(date).push(batch);
  }
  const dates = Array.from(map.keys()).sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
  return dates.map((d) => ({ date: d, batches: map.get(d) }));
}

function renderHistoryDialog() {
  const history = loadHistory();
  const grouped = groupHistoryByDate(history);
  historySubtitle.textContent = grouped.length
    ? `총 ${history.length}회 저장됨 · 날짜별로 확인할 수 있어요`
    : "아직 저장된 내역이 없어요. 주문완료를 누르면 자동으로 쌓입니다.";

  if (!grouped.length) {
    historyBody.replaceChildren(el("div", { class: "history-empty" }, "저장된 주문 내역이 없습니다."));
    return;
  }

  const entries = grouped.map(({ date, batches }) => {
    const lineEls = [];
    for (const b of batches.slice().reverse()) {
      const orders = Array.isArray(b.orders) ? b.orders : [];
      for (const o of orders) {
        lineEls.push(
          el(
            "div",
            { class: "history-line" },
            el("div", { class: "history-name" }, o.name || "(이름 없음)"),
            el("div", { class: "history-menu" }, o.menu || ""),
          ),
        );
      }
      if (orders.length && b !== batches[0]) {
        // intentionally no separator element; spacing is enough
      }
    }

    const totalLines = lineEls.length;
    return el(
      "section",
      { class: "history-entry" },
      el(
        "div",
        { class: "history-date" },
        el("div", {}, date),
        el("div", { class: "history-count" }, `${batches.length}회 · ${totalLines}건`),
      ),
      el("div", { class: "history-lines" }, ...lineEls),
    );
  });

  historyBody.replaceChildren(...entries);
}

completeBtn.addEventListener("click", onComplete);
if (unlockBtn) unlockBtn.hidden = true;

historyBtn?.addEventListener("click", () => {
  renderHistoryDialog();
  historyDialog?.showModal?.();
});

historyCloseBtn?.addEventListener("click", () => historyDialog?.close?.());
historyDialog?.addEventListener("click", (e) => {
  if (e.target === historyDialog) historyDialog.close();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && historyDialog?.open) historyDialog.close();
});

renderRows();
renderStatus();
