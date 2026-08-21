/* Weltreise Planer – App-Logik
 * Speichert alle Daten lokal im Browser (localStorage), damit die App
 * komplett offline funktioniert. Siehe CLAUDE.md für Architektur-Infos.
 */

const STORAGE_KEY = 'weltreiseData';

const DEFAULT_PREP = [
  { text: 'Reisepass prüfen (mind. 6 Monate gültig)', category: 'Dokumente' },
  { text: 'Visa für Zielländer klären', category: 'Dokumente' },
  { text: 'Reise- & Krankenversicherung abschliessen', category: 'Versicherung' },
  { text: 'Impfungen abklären', category: 'Gesundheit' },
  { text: 'Reiseapotheke zusammenstellen', category: 'Gesundheit' },
  { text: 'Kreditkarte ohne Auslandsgebühren besorgen', category: 'Finanzen' },
  { text: 'Wichtige Dokumente digital sichern (Cloud)', category: 'Dokumente' },
  { text: 'Wohnung/Verträge kündigen oder pausieren', category: 'Zuhause' },
  { text: 'Post-Nachsendeauftrag einrichten', category: 'Zuhause' },
  { text: 'Notfallkontakte hinterlegen', category: 'Sicherheit' },
  { text: 'Packliste erstellen', category: 'Packen' },
];

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try { return JSON.parse(raw); } catch (e) { /* fall through */ }
  }
  return {
    budgetTotal: 0,
    currency: 'CHF',
    stops: [],
    expenses: [],
    prep: DEFAULT_PREP.map(p => ({ id: uid(), done: false, ...p })),
  };
}

let data = loadData();

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/* ---------- Navigation state ---------- */
let currentView = 'dashboard';
let currentStopId = null; // when viewing a stop's detail page

const viewRoot = document.getElementById('view-root');
const fab = document.getElementById('fab');
const headerTitle = document.getElementById('header-title');

function setView(view, opts = {}) {
  currentView = view;
  currentStopId = opts.stopId || null;
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });
  render();
}

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => setView(btn.dataset.view));
});

fab.addEventListener('click', () => {
  if (currentView === 'route' && !currentStopId) openStopForm();
  else if (currentView === 'route' && currentStopId) openStopSubItemForm();
  else if (currentView === 'budget') openExpenseForm();
  else if (currentView === 'prep') openPrepForm();
});

/* ---------- Rendering ---------- */

function render() {
  headerTitle.textContent = '🌍 Weltreise Planer';
  fab.classList.remove('hidden');

  if (currentView === 'dashboard') { fab.classList.add('hidden'); renderDashboard(); }
  else if (currentView === 'route' && currentStopId) renderStopDetail(currentStopId);
  else if (currentView === 'route') renderRoute();
  else if (currentView === 'budget') renderBudget();
  else if (currentView === 'prep') renderPrep();
}

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str == null ? '' : String(str);
  return d.innerHTML;
}

function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtMoney(n) {
  const val = Number(n) || 0;
  return val.toLocaleString('de-CH', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' ' + data.currency;
}

/* ---------- Dashboard ---------- */

function renderDashboard() {
  const totalSpent = data.expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const remaining = data.budgetTotal - totalSpent;
  const prepDone = data.prep.filter(p => p.done).length;
  const prepTotal = data.prep.length || 1;

  const sortedStops = [...data.stops].sort((a, b) => (a.arriveDate || '').localeCompare(b.arriveDate || ''));
  const today = new Date().toISOString().slice(0, 10);
  const nextStop = sortedStops.find(s => !s.arriveDate || s.arriveDate >= today) || sortedStops[0];

  viewRoot.innerHTML = `
    <h2 class="view-title">Übersicht</h2>
    <p class="view-sub">Dein Reise-Cockpit auf einen Blick</p>

    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-num">${data.stops.length}</div>
        <div class="stat-label">Stationen geplant</div>
      </div>
      <div class="stat-card">
        <div class="stat-num">${fmtMoney(remaining)}</div>
        <div class="stat-label">Budget übrig</div>
      </div>
    </div>

    <div class="card">
      <p class="card-title">📍 Nächste Station</p>
      ${nextStop
        ? `<p class="card-sub">${esc(nextStop.city ? nextStop.city + ', ' : '')}${esc(nextStop.country)} ${nextStop.arriveDate ? '· ab ' + fmtDate(nextStop.arriveDate) : ''}</p>`
        : `<p class="card-sub">Noch keine Route geplant – füge deine erste Station hinzu.</p>`}
    </div>

    <div class="card">
      <p class="card-title">💰 Budget</p>
      <p class="card-sub">${fmtMoney(totalSpent)} von ${fmtMoney(data.budgetTotal)} ausgegeben</p>
      <div class="progress-bar"><div class="progress-fill ${remaining < 0 ? 'over' : ''}" style="width:${Math.min(100, data.budgetTotal ? (totalSpent / data.budgetTotal) * 100 : 0)}%"></div></div>
    </div>

    <div class="card">
      <p class="card-title">✅ Vorbereitung</p>
      <p class="card-sub">${prepDone} von ${data.prep.length} Aufgaben erledigt</p>
      <div class="progress-bar"><div class="progress-fill" style="width:${(prepDone / prepTotal) * 100}%"></div></div>
    </div>
  `;
}

/* ---------- Route ---------- */

function renderRoute() {
  const sorted = [...data.stops].sort((a, b) => (a.arriveDate || '').localeCompare(b.arriveDate || ''));
  viewRoot.innerHTML = `
    <h2 class="view-title">Reiseroute</h2>
    <p class="view-sub">Deine Stationen – tippe eine an für Details</p>
    ${sorted.length === 0 ? `
      <div class="empty-state"><span class="big">🗺️</span>Noch keine Stationen.<br>Tippe auf ＋ um deine erste Station hinzuzufügen.</div>
    ` : sorted.map(s => `
      <div class="card" data-stop="${s.id}" style="cursor:pointer">
        <p class="card-title">${esc(s.city ? s.city + ', ' : '')}${esc(s.country)}</p>
        <p class="card-sub">${s.arriveDate ? fmtDate(s.arriveDate) : '?'} ${s.leaveDate ? '– ' + fmtDate(s.leaveDate) : ''}</p>
        ${s.notes ? `<p class="card-sub">${esc(s.notes)}</p>` : ''}
      </div>
    `).join('')}
  `;
  viewRoot.querySelectorAll('[data-stop]').forEach(el => {
    el.addEventListener('click', () => setView('route', { stopId: el.dataset.stop }));
  });
}

function renderStopDetail(stopId) {
  const stop = data.stops.find(s => s.id === stopId);
  if (!stop) { setView('route'); return; }
  if (!stop._tab) stop._tab = 'sights';

  const tabs = [
    { key: 'sights', label: '🏛️ Sehenswürdig.' },
    { key: 'food', label: '🍜 Essen' },
    { key: 'stays', label: '🛏️ Unterkunft' },
  ];

  viewRoot.innerHTML = `
    <button class="back-btn" id="back-to-route">← Zurück zur Route</button>
    <h2 class="view-title">${esc(stop.city ? stop.city + ', ' : '')}${esc(stop.country)}</h2>
    <p class="view-sub">${stop.arriveDate ? fmtDate(stop.arriveDate) : '?'} ${stop.leaveDate ? '– ' + fmtDate(stop.leaveDate) : ''}</p>

    <div class="card">
      <p class="card-title">📝 Länderinfos / Notizen</p>
      <p class="card-sub">${stop.notes ? esc(stop.notes) : 'Noch keine Notizen.'}</p>
      <div class="modal-actions" style="margin-top:10px">
        <button class="btn btn-secondary" id="edit-stop-btn">Station bearbeiten</button>
        <button class="btn btn-danger-text" id="delete-stop-btn">Löschen</button>
      </div>
    </div>

    <div class="tabs">
      ${tabs.map(t => `<button class="tab-btn ${stop._tab === t.key ? 'active' : ''}" data-tab="${t.key}">${t.label}</button>`).join('')}
    </div>

    <div id="tab-content"></div>
  `;

  document.getElementById('back-to-route').addEventListener('click', () => setView('route'));
  document.getElementById('edit-stop-btn').addEventListener('click', () => openStopForm(stop));
  document.getElementById('delete-stop-btn').addEventListener('click', () => {
    if (confirm('Diese Station inkl. aller Einträge wirklich löschen?')) {
      data.stops = data.stops.filter(s => s.id !== stop.id);
      save();
      setView('route');
    }
  });

  viewRoot.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => { stop._tab = btn.dataset.tab; renderStopDetail(stopId); });
  });

  renderStopTabContent(stop);
}

function renderStopTabContent(stop) {
  const key = stop._tab;
  const list = stop[key] || [];
  const container = document.getElementById('tab-content');
  const labelMap = { sights: 'Sehenswürdigkeit', food: 'Restaurant/Gericht', stays: 'Unterkunft' };

  container.innerHTML = list.length === 0
    ? `<div class="empty-state"><span class="big">✨</span>Noch nichts eingetragen.<br>Tippe auf ＋ um ${labelMap[key]} hinzuzufügen.</div>`
    : `<div class="card">${list.map(item => `
        <div class="check-row ${item.done ? 'done' : ''}" data-item="${item.id}">
          <input type="checkbox" ${item.done ? 'checked' : ''} data-check="${item.id}">
          <span class="check-text">${esc(item.text)}</span>
          <button class="check-del" data-del="${item.id}">✕</button>
        </div>
      `).join('')}</div>`;

  container.querySelectorAll('[data-check]').forEach(cb => {
    cb.addEventListener('change', () => {
      const item = list.find(i => i.id === cb.dataset.check);
      item.done = cb.checked;
      save();
      renderStopTabContent(stop);
    });
  });
  container.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', () => {
      stop[key] = list.filter(i => i.id !== btn.dataset.del);
      save();
      renderStopTabContent(stop);
    });
  });
}

/* ---------- Budget ---------- */

function renderBudget() {
  const totalSpent = data.expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const remaining = data.budgetTotal - totalSpent;
  const byCategory = {};
  data.expenses.forEach(e => { byCategory[e.category] = (byCategory[e.category] || 0) + Number(e.amount || 0); });

  const sortedExpenses = [...data.expenses].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  viewRoot.innerHTML = `
    <h2 class="view-title">Budget</h2>
    <p class="view-sub">Gesamtbudget: <strong>${fmtMoney(data.budgetTotal)}</strong> · <a href="#" id="edit-budget-link" style="color:var(--primary)">bearbeiten</a></p>

    <div class="card">
      <p class="card-title">${fmtMoney(totalSpent)} ausgegeben</p>
      <p class="card-sub">${remaining >= 0 ? fmtMoney(remaining) + ' übrig' : fmtMoney(Math.abs(remaining)) + ' über Budget'}</p>
      <div class="progress-bar"><div class="progress-fill ${remaining < 0 ? 'over' : ''}" style="width:${Math.min(100, data.budgetTotal ? (totalSpent / data.budgetTotal) * 100 : 0)}%"></div></div>
    </div>

    ${Object.keys(byCategory).length > 0 ? `
      <p class="section-label">Nach Kategorie</p>
      <div class="card">
        ${Object.entries(byCategory).map(([cat, amt]) => `
          <div class="list-item"><div class="list-item-main"><span class="chip">${esc(cat)}</span></div><div class="list-item-right">${fmtMoney(amt)}</div></div>
        `).join('')}
      </div>
    ` : ''}

    <p class="section-label">Ausgaben</p>
    ${sortedExpenses.length === 0 ? `
      <div class="empty-state"><span class="big">💰</span>Noch keine Ausgaben erfasst.<br>Tippe auf ＋ um eine hinzuzufügen.</div>
    ` : `<div class="card">${sortedExpenses.map(e => `
        <div class="list-item" data-exp="${e.id}" style="cursor:pointer">
          <div class="list-item-main">
            <div class="list-item-title">${esc(e.note || e.category)}</div>
            <div class="list-item-sub"><span class="chip">${esc(e.category)}</span>${e.date ? fmtDate(e.date) : ''}</div>
          </div>
          <div class="list-item-right">${fmtMoney(e.amount)}</div>
        </div>
      `).join('')}</div>`}
  `;

  document.getElementById('edit-budget-link').addEventListener('click', (ev) => { ev.preventDefault(); openBudgetSettingsForm(); });
  viewRoot.querySelectorAll('[data-exp]').forEach(el => {
    el.addEventListener('click', () => {
      const exp = data.expenses.find(e => e.id === el.dataset.exp);
      openExpenseForm(exp);
    });
  });
}

/* ---------- Vorbereitung ---------- */

function renderPrep() {
  const grouped = {};
  data.prep.forEach(p => { (grouped[p.category || 'Sonstiges'] = grouped[p.category || 'Sonstiges'] || []).push(p); });
  const done = data.prep.filter(p => p.done).length;

  viewRoot.innerHTML = `
    <h2 class="view-title">Vorbereitung</h2>
    <p class="view-sub">${done} von ${data.prep.length} erledigt</p>
    <div class="progress-bar" style="margin-bottom:16px"><div class="progress-fill" style="width:${data.prep.length ? (done / data.prep.length) * 100 : 0}%"></div></div>
    ${data.prep.length === 0 ? `<div class="empty-state"><span class="big">✅</span>Keine Aufgaben. Tippe auf ＋ um eine hinzuzufügen.</div>` : ''}
    ${Object.entries(grouped).map(([cat, items]) => `
      <p class="section-label">${esc(cat)}</p>
      <div class="card">
        ${items.map(p => `
          <div class="check-row ${p.done ? 'done' : ''}">
            <input type="checkbox" ${p.done ? 'checked' : ''} data-check="${p.id}">
            <span class="check-text">${esc(p.text)}</span>
            <button class="check-del" data-del="${p.id}">✕</button>
          </div>
        `).join('')}
      </div>
    `).join('')}
  `;

  viewRoot.querySelectorAll('[data-check]').forEach(cb => {
    cb.addEventListener('change', () => {
      const item = data.prep.find(p => p.id === cb.dataset.check);
      item.done = cb.checked;
      save();
      renderPrep();
    });
  });
  viewRoot.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', () => {
      data.prep = data.prep.filter(p => p.id !== btn.dataset.del);
      save();
      renderPrep();
    });
  });
}

/* ---------- Modal helper ---------- */

const overlay = document.getElementById('modal-overlay');
const modalBox = document.getElementById('modal-box');

function openModal(html) {
  modalBox.innerHTML = html;
  overlay.classList.remove('hidden');
}
function closeModal() {
  overlay.classList.add('hidden');
  modalBox.innerHTML = '';
}
overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

/* ---------- Forms ---------- */

function openStopForm(stop) {
  const isEdit = !!stop;
  openModal(`
    <h3>${isEdit ? 'Station bearbeiten' : 'Neue Station'}</h3>
    <div class="field"><label>Land</label><input id="f-country" value="${isEdit ? esc(stop.country) : ''}" placeholder="z. B. Thailand"></div>
    <div class="field"><label>Ort (optional)</label><input id="f-city" value="${isEdit ? esc(stop.city || '') : ''}" placeholder="z. B. Bangkok"></div>
    <div class="field"><label>Ankunft</label><input type="date" id="f-arrive" value="${isEdit ? stop.arriveDate || '' : ''}"></div>
    <div class="field"><label>Abreise</label><input type="date" id="f-leave" value="${isEdit ? stop.leaveDate || '' : ''}"></div>
    <div class="field"><label>Länderinfos / Notizen</label><textarea id="f-notes" placeholder="Visum-Hinweise, Klima, Sprache, ...">${isEdit ? esc(stop.notes || '') : ''}</textarea></div>
    <div class="modal-actions">
      <button class="btn btn-secondary" id="cancel-btn">Abbrechen</button>
      <button class="btn btn-primary" id="save-btn">Speichern</button>
    </div>
  `);
  document.getElementById('cancel-btn').addEventListener('click', closeModal);
  document.getElementById('save-btn').addEventListener('click', () => {
    const country = document.getElementById('f-country').value.trim();
    if (!country) { alert('Bitte ein Land eingeben.'); return; }
    const payload = {
      country,
      city: document.getElementById('f-city').value.trim(),
      arriveDate: document.getElementById('f-arrive').value,
      leaveDate: document.getElementById('f-leave').value,
      notes: document.getElementById('f-notes').value.trim(),
    };
    if (isEdit) {
      Object.assign(stop, payload);
    } else {
      data.stops.push({ id: uid(), sights: [], food: [], stays: [], _tab: 'sights', ...payload });
    }
    save();
    closeModal();
    render();
  });
}

function openStopSubItemForm() {
  const stop = data.stops.find(s => s.id === currentStopId);
  if (!stop) return;
  const labelMap = { sights: 'Sehenswürdigkeit', food: 'Restaurant/Gericht', stays: 'Unterkunft' };
  openModal(`
    <h3>${labelMap[stop._tab]} hinzufügen</h3>
    <div class="field"><label>${labelMap[stop._tab]}</label><input id="f-text" placeholder="Name / Notiz"></div>
    <div class="modal-actions">
      <button class="btn btn-secondary" id="cancel-btn">Abbrechen</button>
      <button class="btn btn-primary" id="save-btn">Hinzufügen</button>
    </div>
  `);
  document.getElementById('cancel-btn').addEventListener('click', closeModal);
  document.getElementById('save-btn').addEventListener('click', () => {
    const text = document.getElementById('f-text').value.trim();
    if (!text) { closeModal(); return; }
    stop[stop._tab].push({ id: uid(), text, done: false });
    save();
    closeModal();
    render();
  });
}

const EXPENSE_CATEGORIES = ['Transport', 'Unterkunft', 'Essen', 'Aktivitäten', 'Ausrüstung', 'Sonstiges'];

function openExpenseForm(expense) {
  const isEdit = !!expense;
  openModal(`
    <h3>${isEdit ? 'Ausgabe bearbeiten' : 'Neue Ausgabe'}</h3>
    <div class="field"><label>Betrag (${esc(data.currency)})</label><input type="number" step="0.01" id="f-amount" value="${isEdit ? expense.amount : ''}" placeholder="0.00"></div>
    <div class="field"><label>Kategorie</label>
      <select id="f-category">${EXPENSE_CATEGORIES.map(c => `<option ${isEdit && expense.category === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
    </div>
    <div class="field"><label>Notiz</label><input id="f-note" value="${isEdit ? esc(expense.note || '') : ''}" placeholder="z. B. Hostel 3 Nächte"></div>
    <div class="field"><label>Datum</label><input type="date" id="f-date" value="${isEdit ? expense.date || '' : new Date().toISOString().slice(0,10)}"></div>
    <div class="modal-actions">
      <button class="btn btn-secondary" id="cancel-btn">Abbrechen</button>
      <button class="btn btn-primary" id="save-btn">Speichern</button>
    </div>
    ${isEdit ? '<button class="btn btn-danger-text" id="del-btn" style="width:100%;margin-top:8px">Ausgabe löschen</button>' : ''}
  `);
  document.getElementById('cancel-btn').addEventListener('click', closeModal);
  document.getElementById('save-btn').addEventListener('click', () => {
    const amount = parseFloat(document.getElementById('f-amount').value);
    if (isNaN(amount)) { alert('Bitte einen Betrag eingeben.'); return; }
    const payload = {
      amount,
      category: document.getElementById('f-category').value,
      note: document.getElementById('f-note').value.trim(),
      date: document.getElementById('f-date').value,
    };
    if (isEdit) Object.assign(expense, payload);
    else data.expenses.push({ id: uid(), ...payload });
    save();
    closeModal();
    render();
  });
  if (isEdit) {
    document.getElementById('del-btn').addEventListener('click', () => {
      data.expenses = data.expenses.filter(e => e.id !== expense.id);
      save();
      closeModal();
      render();
    });
  }
}

function openBudgetSettingsForm() {
  openModal(`
    <h3>Budget-Einstellungen</h3>
    <div class="field"><label>Gesamtbudget</label><input type="number" step="1" id="f-total" value="${data.budgetTotal}"></div>
    <div class="field"><label>Währung</label><input id="f-currency" value="${esc(data.currency)}" placeholder="CHF"></div>
    <div class="modal-actions">
      <button class="btn btn-secondary" id="cancel-btn">Abbrechen</button>
      <button class="btn btn-primary" id="save-btn">Speichern</button>
    </div>
  `);
  document.getElementById('cancel-btn').addEventListener('click', closeModal);
  document.getElementById('save-btn').addEventListener('click', () => {
    data.budgetTotal = parseFloat(document.getElementById('f-total').value) || 0;
    data.currency = document.getElementById('f-currency').value.trim() || 'CHF';
    save();
    closeModal();
    render();
  });
}

function openPrepForm() {
  openModal(`
    <h3>Aufgabe hinzufügen</h3>
    <div class="field"><label>Aufgabe</label><input id="f-text" placeholder="z. B. Auslandskrankenversicherung abschliessen"></div>
    <div class="field"><label>Kategorie</label><input id="f-category" placeholder="z. B. Dokumente" value="Sonstiges"></div>
    <div class="modal-actions">
      <button class="btn btn-secondary" id="cancel-btn">Abbrechen</button>
      <button class="btn btn-primary" id="save-btn">Hinzufügen</button>
    </div>
  `);
  document.getElementById('cancel-btn').addEventListener('click', closeModal);
  document.getElementById('save-btn').addEventListener('click', () => {
    const text = document.getElementById('f-text').value.trim();
    if (!text) { closeModal(); return; }
    data.prep.push({ id: uid(), text, category: document.getElementById('f-category').value.trim() || 'Sonstiges', done: false });
    save();
    closeModal();
    render();
  });
}

/* ---------- Init ---------- */

setView('dashboard');

/* ---------- Offline / Service Worker ---------- */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  });
}

window.addEventListener('online', () => document.getElementById('offline-badge').classList.add('hidden'));
window.addEventListener('offline', () => document.getElementById('offline-badge').classList.remove('hidden'));
if (!navigator.onLine) document.getElementById('offline-badge').classList.remove('hidden');
