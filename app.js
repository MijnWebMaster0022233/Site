/* ============================================================
   Budget & Expense Tracker
   All data is stored locally in the browser (localStorage).
   ============================================================ */

const STORAGE_KEY = "budget-tracker-v1";

/* ---------- Default state ---------- */
const defaultState = {
  income: 2300,
  fixed: [
    { id: uid(), name: "Rent / food", amount: 750 },
    { id: uid(), name: "Stocks", amount: 80 },
    { id: uid(), name: "Pensioensparen", amount: 80 },
  ],
  funPct: 50,          // % of leftover allocated to fun (rest goes to saving)
  expenses: [],        // { id, place, amount, note, date, category: "fun" | "living" }
};

let state = load();

/* ---------- Helpers ---------- */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultState);
    const parsed = JSON.parse(raw);
    return { ...structuredClone(defaultState), ...parsed };
  } catch {
    return structuredClone(defaultState);
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function euro(n) {
  const val = Number.isFinite(n) ? n : 0;
  return "€" + val.toLocaleString("nl-NL", {
    minimumFractionDigits: val % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

/* ---------- Element refs ---------- */
const $ = (id) => document.getElementById(id);

const incomeInput = $("income");
const fixedList = $("fixed-list");
const fixedTotalEl = $("fixed-total");
const addFixedBtn = $("add-fixed");

const leftoverEl = $("leftover");
const funSlider = $("fun-slider");
const funAmountEl = $("fun-amount");
const funBox = $("fun-box");
const saveBox = $("save-box");

const expenseForm = $("expense-form");
const expPlace = $("exp-place");
const expAmount = $("exp-amount");
const expNote = $("exp-note");
const expenseListEl = $("expense-list");
const spentLine = $("spent-line");
const spentTotalEl = $("spent-total");

const sumIncome = $("sum-income");
const sumFixed = $("sum-fixed");
const sumSpent = $("sum-spent");
const sumLivingSpent = $("sum-livingspent");
const sumFunLeft = $("sum-funleft");
const sumSaving = $("sum-saving");

const resetBtn = $("reset-btn");

/* ---------- Computations ---------- */
function fixedTotal() {
  return state.fixed.reduce((s, f) => s + (Number(f.amount) || 0), 0);
}
function leftover() {
  return Math.max(0, (Number(state.income) || 0) - fixedTotal());
}
function funBudget() {
  return leftover() * (state.funPct / 100);
}
function saveBudget() {
  return leftover() - funBudget();
}
function isThisMonth(e) {
  const now = new Date();
  const d = new Date(e.date);
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}
function spentThisMonth(category) {
  return state.expenses
    .filter((e) => isThisMonth(e) && (e.category || "fun") === category)
    .reduce((s, e) => s + (Number(e.amount) || 0), 0);
}

/* ---------- Renderers ---------- */
function renderFixed() {
  fixedList.innerHTML = "";
  state.fixed.forEach((f) => {
    const li = document.createElement("li");

    const name = document.createElement("input");
    name.type = "text";
    name.className = "fx-name";
    name.value = f.name;
    name.placeholder = "Cost name";
    name.addEventListener("input", () => {
      f.name = name.value;
      save();
    });

    const wrap = document.createElement("div");
    wrap.className = "input-euro small";
    const euroSpan = document.createElement("span");
    euroSpan.className = "euro";
    euroSpan.textContent = "€";
    const amount = document.createElement("input");
    amount.type = "number";
    amount.min = "0";
    amount.step = "10";
    amount.value = f.amount;
    amount.addEventListener("input", () => {
      f.amount = Number(amount.value) || 0;
      save();
      renderTotals();
    });
    wrap.append(euroSpan, amount);

    const del = document.createElement("button");
    del.className = "icon-btn";
    del.title = "Remove";
    del.textContent = "✕";
    del.addEventListener("click", () => {
      state.fixed = state.fixed.filter((x) => x.id !== f.id);
      save();
      renderFixed();
      renderTotals();
    });

    li.append(name, wrap, del);
    fixedList.appendChild(li);
  });
}

function renderExpenses() {
  expenseListEl.innerHTML = "";
  const sorted = [...state.expenses].sort((a, b) => new Date(b.date) - new Date(a.date));
  sorted.slice(0, 30).forEach((e) => {
    const li = document.createElement("li");

    const category = e.category || "fun";

    const main = document.createElement("div");
    main.className = "ex-main";
    const place = document.createElement("div");
    place.className = "ex-place";
    place.textContent = e.place || "Expense";
    main.appendChild(place);
    if (e.note) {
      const note = document.createElement("div");
      note.className = "ex-note";
      note.textContent = e.note;
      main.appendChild(note);
    }

    // Toggle button: switch this expense between fun and living costs
    const toggle = document.createElement("button");
    toggle.className = "cat-btn " + category;
    toggle.title = "Click to switch category";
    toggle.textContent = category === "fun" ? "🎉 Fun" : "🏠 Living";
    toggle.addEventListener("click", () => {
      e.category = category === "fun" ? "living" : "fun";
      save();
      renderExpenses();
      renderTotals();
    });

    const amount = document.createElement("span");
    amount.className = "ex-amount " + category;
    amount.textContent = euro(Number(e.amount));

    const date = document.createElement("span");
    date.className = "ex-date";
    const d = new Date(e.date);
    date.textContent = d.toLocaleDateString("nl-NL", { day: "2-digit", month: "2-digit" });

    const del = document.createElement("button");
    del.className = "icon-btn";
    del.title = "Remove";
    del.textContent = "✕";
    del.addEventListener("click", () => {
      state.expenses = state.expenses.filter((x) => x.id !== e.id);
      save();
      renderExpenses();
      renderTotals();
    });

    li.append(main, toggle, amount, date, del);
    expenseListEl.appendChild(li);
  });
}

function renderTotals() {
  fixedTotalEl.textContent = euro(fixedTotal());
  leftoverEl.textContent = euro(leftover());

  funAmountEl.textContent = euro(funBudget());
  funBox.textContent = euro(funBudget());
  saveBox.textContent = euro(saveBudget());

  // colour the slider track to match the split
  funSlider.style.background =
    `linear-gradient(90deg, var(--fun) 0%, var(--fun) ${state.funPct}%,` +
    ` var(--save) ${state.funPct}%, var(--save) 100%)`;

  const funSpent = spentThisMonth("fun");
  const livingSpent = spentThisMonth("living");
  spentTotalEl.textContent = euro(funSpent);
  spentLine.hidden = state.expenses.length === 0;

  // summary
  const funLeft = funBudget() - funSpent;
  const savingLeft = saveBudget() - livingSpent;
  sumIncome.textContent = euro(Number(state.income) || 0);
  sumFixed.textContent = euro(fixedTotal());
  sumSpent.textContent = euro(funSpent);
  sumLivingSpent.textContent = euro(livingSpent);
  sumFunLeft.textContent = euro(funLeft);
  sumSaving.textContent = euro(savingLeft);

  // warn if overspent on fun / savings eaten into
  sumFunLeft.classList.toggle("neg", funLeft < 0);
  sumFunLeft.classList.toggle("pos", funLeft >= 0);
  sumSaving.classList.toggle("neg", savingLeft < 0);
  sumSaving.classList.toggle("pos", savingLeft >= 0);
}

/* ---------- Init form values ---------- */
function hydrate() {
  incomeInput.value = state.income;
  funSlider.value = state.funPct;
  renderFixed();
  renderExpenses();
  renderTotals();
}

/* ---------- Events ---------- */
incomeInput.addEventListener("input", () => {
  state.income = Number(incomeInput.value) || 0;
  save();
  renderTotals();
});

addFixedBtn.addEventListener("click", () => {
  state.fixed.push({ id: uid(), name: "", amount: 0 });
  save();
  renderFixed();
});

funSlider.addEventListener("input", () => {
  state.funPct = Number(funSlider.value);
  save();
  renderTotals();
});

expenseForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const amount = Number(expAmount.value);
  if (!amount || amount <= 0) {
    expAmount.focus();
    return;
  }
  state.expenses.push({
    id: uid(),
    place: expPlace.value.trim(),
    amount,
    note: expNote.value.trim(),
    category: "fun",
    date: new Date().toISOString(),
  });
  save();
  expPlace.value = "";
  expAmount.value = "";
  expNote.value = "";
  expPlace.focus();
  renderExpenses();
  renderTotals();
});

resetBtn.addEventListener("click", () => {
  if (confirm("Reset everything? This wipes your income, costs and expenses on this device.")) {
    state = structuredClone(defaultState);
    // give defaults fresh ids
    state.fixed.forEach((f) => (f.id = uid()));
    save();
    hydrate();
  }
});

/* ---------- Go ---------- */
hydrate();
