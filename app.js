/* Weltreise Planer – App-Logik
 * Speichert alle Daten lokal im Browser (localStorage), damit die App
 * komplett offline funktioniert. Siehe CLAUDE.md für Architektur-Infos.
 */

const STORAGE_KEY = 'weltreiseData';

// Zeitstempel des letzten Code-Updates – wird von Claude bei jeder Änderung
// von Hand angepasst, damit auf der Übersicht sichtbar ist, welche Version läuft.
const APP_BUILD = '24.08.2026 21:35';

const COUNTRIES_DE = [
  'Afghanistan', 'Ägypten', 'Albanien', 'Algerien', 'Andorra', 'Angola', 'Antigua und Barbuda',
  'Äquatorialguinea', 'Argentinien', 'Armenien', 'Aserbaidschan', 'Äthiopien', 'Australien',
  'Bahamas', 'Bahrain', 'Bangladesch', 'Barbados', 'Belgien', 'Belize', 'Benin', 'Bhutan',
  'Bolivien', 'Bosnien und Herzegowina', 'Botsuana', 'Brasilien', 'Brunei', 'Bulgarien',
  'Burkina Faso', 'Burundi', 'Chile', 'China', 'Costa Rica', 'Dänemark', 'Deutschland',
  'Dominica', 'Dominikanische Republik', 'Dschibuti', 'Ecuador', 'El Salvador', 'Elfenbeinküste',
  'Eritrea', 'Estland', 'Eswatini', 'Fidschi', 'Finnland', 'Frankreich', 'Gabun', 'Gambia',
  'Georgien', 'Ghana', 'Grenada', 'Griechenland', 'Guatemala', 'Guinea', 'Guinea-Bissau',
  'Guyana', 'Haiti', 'Honduras', 'Hongkong', 'Indien', 'Indonesien', 'Irak', 'Iran', 'Irland',
  'Island', 'Israel', 'Italien', 'Jamaika', 'Japan', 'Jemen', 'Jordanien', 'Kambodscha',
  'Kamerun', 'Kanada', 'Kap Verde', 'Kasachstan', 'Katar', 'Kenia', 'Kirgisistan', 'Kiribati',
  'Kolumbien', 'Komoren', 'Kongo (Republik)', 'Kongo (Demokratische Republik)', 'Kosovo',
  'Kroatien', 'Kuba', 'Kuwait', 'Laos', 'Lesotho', 'Lettland', 'Libanon', 'Liberia', 'Libyen',
  'Liechtenstein', 'Litauen', 'Luxemburg', 'Macau', 'Madagaskar', 'Malawi', 'Malaysia',
  'Malediven', 'Mali', 'Malta', 'Marokko', 'Marshallinseln', 'Mauretanien', 'Mauritius',
  'Mexiko', 'Mikronesien', 'Moldau', 'Monaco', 'Mongolei', 'Montenegro', 'Mosambik', 'Myanmar',
  'Namibia', 'Nauru', 'Nepal', 'Neuseeland', 'Nicaragua', 'Niederlande', 'Niger', 'Nigeria',
  'Nordkorea', 'Nordmazedonien', 'Norwegen', 'Oman', 'Österreich', 'Osttimor', 'Pakistan',
  'Palau', 'Palästina', 'Panama', 'Papua-Neuguinea', 'Paraguay', 'Peru', 'Philippinen', 'Polen',
  'Portugal', 'Ruanda', 'Rumänien', 'Russland', 'Salomonen', 'Sambia', 'Samoa', 'San Marino',
  'São Tomé und Príncipe', 'Saudi-Arabien', 'Schweden', 'Schweiz', 'Senegal', 'Serbien',
  'Seychellen', 'Sierra Leone', 'Simbabwe', 'Singapur', 'Slowakei', 'Slowenien', 'Somalia',
  'Spanien', 'Sri Lanka', 'St. Kitts und Nevis', 'St. Lucia', 'St. Vincent und die Grenadinen',
  'Südafrika', 'Sudan', 'Südkorea', 'Südsudan', 'Suriname', 'Syrien', 'Tadschikistan', 'Taiwan',
  'Tansania', 'Thailand', 'Togo', 'Tonga', 'Trinidad und Tobago', 'Tschad', 'Tschechien',
  'Tunesien', 'Türkei', 'Turkmenistan', 'Tuvalu', 'Uganda', 'Ukraine', 'Ungarn', 'Uruguay',
  'Usbekistan', 'Vanuatu', 'Vatikanstadt', 'Venezuela', 'Vereinigte Arabische Emirate',
  'Vereinigte Staaten', 'Vereinigtes Königreich', 'Vietnam', 'Weißrussland',
  'Zentralafrikanische Republik', 'Zypern',
];

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
let routeViewMode = 'list'; // 'list' | 'map'
let routeMapInstance = null;

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

/* ---------- Icons (minimalistisches SVG-Set statt Emoji) ---------- */

const ICON_PATHS = {
  home: '<path d="M4 11l8-7 8 7"/><path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9"/><path d="M10 20v-6h4v6"/>',
  route: '<path d="M9 4 4 6v14l5-2 6 2 5-2V6l-5-2-6 2z"/><path d="M9 4v14"/><path d="M15 6v14"/>',
  wallet: '<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10.5h18"/><path d="M16 14.5h2"/>',
  checklist: '<rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M8 8h8M8 12.5h8M8 17h5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.3-4.3"/>',
  pencil: '<path d="M4 20l1-4L16 5l3 3L8 19l-4 1z"/><path d="M14 7l3 3"/>',
  trash: '<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/><path d="M10 11v6M14 11v6"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  chevronLeft: '<path d="M15 18 9 12 15 6"/>',
  flag: '<path d="M6 21V4"/><path d="M6 4l11 3-11 5"/>',
  bowl: '<path d="M4 12h16a8 8 0 0 1-16 0z"/><path d="M12 10V4"/>',
  bed: '<path d="M3 18v-7a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2h2v-2a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v7"/><path d="M3 18v2M21 18v2"/><path d="M3 13h18"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 8h.01"/><path d="M11 11h1v6h1"/>',
  download: '<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M4 19h16"/>',
};

function icon(name, cls) {
  const path = ICON_PATHS[name];
  if (!path) return '';
  return `<svg class="icon${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
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
      <p class="card-title">${icon('flag')} Nächste Station</p>
      ${nextStop
        ? `<p class="card-sub">${esc(nextStop.city ? nextStop.city + ', ' : '')}${esc(nextStop.country)} ${nextStop.arriveDate ? '· ab ' + fmtDate(nextStop.arriveDate) : ''}</p>`
        : `<p class="card-sub">Noch keine Route geplant – füge deine erste Station hinzu.</p>`}
    </div>

    <div class="card">
      <p class="card-title">${icon('wallet')} Budget</p>
      <p class="card-sub">${fmtMoney(totalSpent)} von ${fmtMoney(data.budgetTotal)} ausgegeben</p>
      <div class="progress-bar"><div class="progress-fill ${remaining < 0 ? 'over' : ''}" style="width:${Math.min(100, data.budgetTotal ? (totalSpent / data.budgetTotal) * 100 : 0)}%"></div></div>
    </div>

    <div class="card">
      <p class="card-title">${icon('checklist')} Vorbereitung</p>
      <p class="card-sub">${prepDone} von ${data.prep.length} Aufgaben erledigt</p>
      <div class="progress-bar"><div class="progress-fill" style="width:${(prepDone / prepTotal) * 100}%"></div></div>
    </div>

    <div class="card">
      <p class="card-title">${icon('download')} Daten sichern</p>
      <p class="card-sub">Alle Reisedaten als Datei sichern oder aus einer Datei wiederherstellen.</p>
      <div class="modal-actions" style="margin-top:10px">
        <button class="btn btn-secondary" id="export-btn">Exportieren</button>
        <button class="btn btn-secondary" id="import-btn">Importieren</button>
      </div>
      <input type="file" id="import-file-input" accept="application/json,.json" class="hidden">
    </div>

    <p class="build-info">App-Version vom ${esc(APP_BUILD)}</p>
  `;

  document.getElementById('export-btn').addEventListener('click', exportData);
  document.getElementById('import-btn').addEventListener('click', () => {
    document.getElementById('import-file-input').click();
  });
  document.getElementById('import-file-input').addEventListener('change', (ev) => {
    const file = ev.target.files[0];
    if (file) importDataFromFile(file);
    ev.target.value = '';
  });
}

/* ---------- Datenexport / -import ---------- */

function exportData() {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `weltreise-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importDataFromFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    let parsed;
    try {
      parsed = JSON.parse(reader.result);
    } catch (e) {
      alert('Die Datei ist kein gültiges JSON-Backup.');
      return;
    }
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.stops)) {
      alert('Diese Datei sieht nicht wie ein Weltreise-Planer-Backup aus.');
      return;
    }
    if (!confirm('Die aktuellen Daten in der App werden durch die Datei ersetzt. Fortfahren?')) return;
    data = {
      budgetTotal: Number(parsed.budgetTotal) || 0,
      currency: typeof parsed.currency === 'string' && parsed.currency ? parsed.currency : 'CHF',
      stops: Array.isArray(parsed.stops) ? parsed.stops : [],
      expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
      prep: Array.isArray(parsed.prep) ? parsed.prep : [],
    };
    save();
    alert('Backup erfolgreich importiert.');
    render();
  };
  reader.onerror = () => alert('Datei konnte nicht gelesen werden.');
  reader.readAsText(file);
}

/* ---------- Route ---------- */

function renderRoute() {
  const sorted = [...data.stops].sort((a, b) => (a.arriveDate || '').localeCompare(b.arriveDate || ''));

  if (sorted.length === 0) {
    viewRoot.innerHTML = `
      <h2 class="view-title">Reiseroute</h2>
      <p class="view-sub">Deine Stationen – tippe eine an für Details</p>
      <div class="empty-state">${icon('route', 'icon-big')}Noch keine Stationen.<br>Tippe auf ＋ um deine erste Station hinzuzufügen.</div>
    `;
    return;
  }

  const geoStops = sorted.filter(s => isFinite(s.lat) && isFinite(s.lon));

  viewRoot.innerHTML = `
    <h2 class="view-title">Reiseroute</h2>
    <p class="view-sub">Deine Stationen – tippe eine an für Details</p>

    <div class="tabs route-view-toggle">
      <button class="tab-btn ${routeViewMode === 'list' ? 'active' : ''}" data-mode="list">${icon('checklist')} Liste</button>
      <button class="tab-btn ${routeViewMode === 'map' ? 'active' : ''}" data-mode="map">${icon('route')} Karte</button>
    </div>

    ${routeViewMode === 'map' ? `
      <div class="map-wrap">
        <div class="map-search">
          <div class="autocomplete-field">
            <div class="map-search-field">
              ${icon('search')}
              <input id="map-search-input" placeholder="Land suchen und hinfliegen …" autocomplete="off">
              <button type="button" class="map-search-clear hidden" id="map-search-clear" aria-label="Suche löschen">${icon('x')}</button>
            </div>
            <div id="map-search-suggestions" class="suggestions-list hidden"></div>
          </div>
        </div>
        <div id="route-map" class="map-container"></div>
      </div>
      ${geoStops.length === 0
        ? `<p class="map-hint">Noch keine Station mit Koordinaten. Öffne eine Station zum Bearbeiten und tippe im Formular auf "Suchen" – oder erkunde die Karte oben frei mit der Suche.</p>`
        : (sorted.length > geoStops.length ? `<p class="map-hint">${sorted.length - geoStops.length} Station(en) ohne Koordinaten werden auf der Karte nicht angezeigt.</p>` : '')}
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
  viewRoot.querySelectorAll('[data-mode]').forEach(btn => {
    btn.addEventListener('click', () => { routeViewMode = btn.dataset.mode; renderRoute(); });
  });

  if (routeViewMode === 'map') initRouteMap(geoStops);
}

let searchMarker = null;

function initRouteMap(stops) {
  const container = document.getElementById('route-map');
  if (!container) return;

  if (typeof L === 'undefined') {
    const wrap = container.closest('.map-wrap') || container;
    wrap.outerHTML = `<div class="empty-state">${icon('route', 'icon-big')}Karte konnte nicht geladen werden.<br>Dafür ist beim ersten Öffnen eine Internetverbindung nötig.</div>`;
    return;
  }

  if (routeMapInstance) { routeMapInstance.remove(); routeMapInstance = null; }
  searchMarker = null;

  const map = L.map(container, { scrollWheelZoom: false });
  routeMapInstance = map;

  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20,
    detectRetina: true,
  }).addTo(map);

  if (stops.length === 0) {
    map.setView([20, 0], 2);
  } else {
    const points = stops.map(s => [s.lat, s.lon]);

    stops.forEach((s, i) => {
      const markerIcon = L.divIcon({
        className: 'route-marker',
        html: `<div class="route-marker-num">${i + 1}</div>`,
        iconSize: [27, 27],
        iconAnchor: [13.5, 13.5],
      });
      L.marker([s.lat, s.lon], { icon: markerIcon }).addTo(map)
        .bindPopup(`<strong>${esc(s.city ? s.city + ', ' : '')}${esc(s.country)}</strong>${s.arriveDate ? '<br>' + fmtDate(s.arriveDate) : ''}`);
    });

    if (points.length > 1) {
      L.polyline(points, { color: '#146c94', weight: 3, opacity: 0.7, dashArray: '6 6' }).addTo(map);
    }

    if (points.length === 1) map.setView(points[0], 6);
    else map.fitBounds(points, { padding: [30, 30] });
  }

  initMapSearch(map);
}

/* ---------- Freie Kartensuche (unabhängig von gespeicherten Stationen) ---------- */

function initMapSearch(map) {
  const input = document.getElementById('map-search-input');
  const box = document.getElementById('map-search-suggestions');
  const clearBtn = document.getElementById('map-search-clear');
  if (!input || !box) return;

  function flyToQuery(query) {
    if (!query.trim()) return;
    geocodeQuery(query).then((result) => {
      if (!result) {
        input.placeholder = 'Nichts gefunden – anderen Begriff versuchen';
        return;
      }
      const searchIcon = L.divIcon({
        className: 'search-marker',
        html: `<div class="search-marker-pin"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      if (searchMarker) map.removeLayer(searchMarker);
      searchMarker = L.marker([result.lat, result.lon], { icon: searchIcon })
        .addTo(map)
        .bindPopup(esc(result.display_name))
        .openPopup();
      map.flyTo([result.lat, result.lon], 6, { duration: 1.2 });
      clearBtn.classList.remove('hidden');
    });
  }

  setupAutocomplete(input, box, COUNTRIES_DE, (value) => {
    input.value = value;
    flyToQuery(value);
  });

  input.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') { ev.preventDefault(); box.classList.add('hidden'); flyToQuery(input.value); }
  });
  input.addEventListener('input', () => { clearBtn.classList.toggle('hidden', !input.value.trim()); });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    clearBtn.classList.add('hidden');
    if (searchMarker) { map.removeLayer(searchMarker); searchMarker = null; }
  });
}

function geocodeQuery(query) {
  if (!query || !query.trim()) return Promise.resolve(null);
  return fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query.trim())}`)
    .then(res => res.json())
    .then(results => (results && results.length > 0) ? results[0] : null)
    .catch(() => null);
}

function renderStopDetail(stopId) {
  const stop = data.stops.find(s => s.id === stopId);
  if (!stop) { setView('route'); return; }
  if (!stop._tab) stop._tab = 'sights';

  const tabs = [
    { key: 'sights', label: 'Sehenswert', icon: 'flag' },
    { key: 'food', label: 'Essen', icon: 'bowl' },
    { key: 'stays', label: 'Unterkunft', icon: 'bed' },
  ];

  viewRoot.innerHTML = `
    <button class="back-btn" id="back-to-route">${icon('chevronLeft')} Zurück zur Route</button>
    <h2 class="view-title">${esc(stop.city ? stop.city + ', ' : '')}${esc(stop.country)}</h2>
    <p class="view-sub">${stop.arriveDate ? fmtDate(stop.arriveDate) : '?'} ${stop.leaveDate ? '– ' + fmtDate(stop.leaveDate) : ''}</p>

    <div class="card">
      <p class="card-title">${icon('info')} Länderinfos / Notizen</p>
      <p class="card-sub">${stop.notes ? esc(stop.notes) : 'Noch keine Notizen.'}</p>
      <div class="modal-actions" style="margin-top:10px">
        <button class="btn btn-secondary" id="edit-stop-btn">${icon('pencil')} Bearbeiten</button>
        <button class="btn btn-danger-text" id="delete-stop-btn" aria-label="Station löschen" title="Station löschen">${icon('trash')}</button>
      </div>
    </div>

    <div class="tabs">
      ${tabs.map(t => `<button class="tab-btn ${stop._tab === t.key ? 'active' : ''}" data-tab="${t.key}">${icon(t.icon)} ${t.label}</button>`).join('')}
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
    ? `<div class="empty-state">${icon(key === 'food' ? 'bowl' : key === 'stays' ? 'bed' : 'flag', 'icon-big')}Noch nichts eingetragen.<br>Tippe auf ＋ um ${labelMap[key]} hinzuzufügen.</div>`
    : `<div class="card">${list.map(item => `
        <div class="check-row ${item.done ? 'done' : ''}" data-item="${item.id}">
          <input type="checkbox" ${item.done ? 'checked' : ''} data-check="${item.id}">
          <span class="check-text">${esc(item.text)}</span>
          <button class="check-del" data-del="${item.id}" aria-label="Eintrag löschen">${icon('x')}</button>
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
      <div class="empty-state">${icon('wallet', 'icon-big')}Noch keine Ausgaben erfasst.<br>Tippe auf ＋ um eine hinzuzufügen.</div>
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
    ${data.prep.length === 0 ? `<div class="empty-state">${icon('checklist', 'icon-big')}Keine Aufgaben. Tippe auf ＋ um eine hinzuzufügen.</div>` : ''}
    ${Object.entries(grouped).map(([cat, items]) => `
      <p class="section-label">${esc(cat)}</p>
      <div class="card">
        ${items.map(p => `
          <div class="check-row ${p.done ? 'done' : ''}">
            <input type="checkbox" ${p.done ? 'checked' : ''} data-check="${p.id}">
            <span class="check-text">${esc(p.text)}</span>
            <button class="check-del" data-del="${p.id}" aria-label="Eintrag löschen">${icon('x')}</button>
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
    <div class="field autocomplete-field">
      <label>Land</label>
      <input id="f-country" value="${isEdit ? esc(stop.country) : ''}" placeholder="z. B. Thailand" autocomplete="off">
      <div id="country-suggestions" class="suggestions-list hidden"></div>
    </div>
    <div class="field"><label>Ort (optional)</label><input id="f-city" value="${isEdit ? esc(stop.city || '') : ''}" placeholder="z. B. Bangkok"></div>
    <div class="field"><label>Ankunft</label><input type="date" id="f-arrive" value="${isEdit ? stop.arriveDate || '' : ''}"></div>
    <div class="field"><label>Abreise</label><input type="date" id="f-leave" value="${isEdit ? stop.leaveDate || '' : ''}"></div>
    <div class="field"><label>Länderinfos / Notizen</label><textarea id="f-notes" placeholder="Visum-Hinweise, Klima, Sprache, ...">${isEdit ? esc(stop.notes || '') : ''}</textarea></div>
    <div class="field">
      <label>Koordinaten (für Kartenansicht)</label>
      <div class="geo-row">
        <input id="f-lat" type="number" step="any" value="${isEdit && isFinite(stop.lat) ? stop.lat : ''}" placeholder="Breitengrad">
        <input id="f-lon" type="number" step="any" value="${isEdit && isFinite(stop.lon) ? stop.lon : ''}" placeholder="Längengrad">
        <button type="button" class="btn-geo" id="geo-btn">${icon('search')} Suchen</button>
      </div>
      <p class="geo-status" id="geo-status"></p>
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" id="cancel-btn">Abbrechen</button>
      <button class="btn btn-primary" id="save-btn">Speichern</button>
    </div>
  `);
  document.getElementById('cancel-btn').addEventListener('click', closeModal);
  document.getElementById('geo-btn').addEventListener('click', geocodeStopFields);
  setupAutocomplete(
    document.getElementById('f-country'),
    document.getElementById('country-suggestions'),
    COUNTRIES_DE,
    (value) => { document.getElementById('f-country').value = value; }
  );
  document.getElementById('save-btn').addEventListener('click', () => {
    const country = document.getElementById('f-country').value.trim();
    if (!country) { alert('Bitte ein Land eingeben.'); return; }
    const latVal = parseFloat(document.getElementById('f-lat').value);
    const lonVal = parseFloat(document.getElementById('f-lon').value);
    const payload = {
      country,
      city: document.getElementById('f-city').value.trim(),
      arriveDate: document.getElementById('f-arrive').value,
      leaveDate: document.getElementById('f-leave').value,
      notes: document.getElementById('f-notes').value.trim(),
      lat: isFinite(latVal) ? latVal : undefined,
      lon: isFinite(lonVal) ? lonVal : undefined,
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

// Wiederverwendbare Vorschlagsliste: filtert `list` nach Eingabe in `input`,
// zeigt Treffer in `box` an, ruft `onSelect(value)` bei Klick auf einen Treffer auf.
function setupAutocomplete(input, box, list, onSelect) {
  function showMatches() {
    const val = input.value.trim().toLowerCase();
    if (!val) { box.classList.add('hidden'); box.innerHTML = ''; return; }
    const startsWith = list.filter(c => c.toLowerCase().startsWith(val));
    const contains = list.filter(c => !c.toLowerCase().startsWith(val) && c.toLowerCase().includes(val));
    const matches = [...startsWith, ...contains].slice(0, 8);
    if (matches.length === 0) { box.classList.add('hidden'); box.innerHTML = ''; return; }
    box.innerHTML = matches.map(c => `<div class="suggestion-item" data-value="${esc(c)}">${esc(c)}</div>`).join('');
    box.classList.remove('hidden');
  }

  input.addEventListener('input', showMatches);
  input.addEventListener('focus', () => { if (input.value.trim()) showMatches(); });
  input.addEventListener('blur', () => { setTimeout(() => box.classList.add('hidden'), 150); });
  box.addEventListener('click', (ev) => {
    const item = ev.target.closest('[data-value]');
    if (!item) return;
    box.classList.add('hidden');
    box.innerHTML = '';
    onSelect(item.dataset.value);
  });
}

function geocodeStopFields() {
  const country = document.getElementById('f-country').value.trim();
  const city = document.getElementById('f-city').value.trim();
  const status = document.getElementById('geo-status');
  const btn = document.getElementById('geo-btn');
  if (!country) { status.textContent = 'Bitte zuerst ein Land eingeben.'; return; }

  const query = [city, country].filter(Boolean).join(', ');
  status.textContent = 'Suche …';
  btn.disabled = true;

  geocodeQuery(query).then((result) => {
    if (!result) {
      status.textContent = 'Nichts gefunden – bitte Koordinaten manuell eintragen.';
      return;
    }
    document.getElementById('f-lat').value = parseFloat(result.lat).toFixed(5);
    document.getElementById('f-lon').value = parseFloat(result.lon).toFixed(5);
    status.textContent = `Gefunden: ${result.display_name}`;
  }).finally(() => { btn.disabled = false; });
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
  let swReloading = false;

  // updateViaCache: 'none' zwingt den Browser, service-worker.js bei jeder Prüfung
  // wirklich frisch vom Server zu laden statt eine evtl. veraltete HTTP-Cache-Kopie
  // zu benutzen. Ohne das prüfen manche Browser (v.a. iOS Safari als Homescreen-App)
  // teils nur alle 24h automatisch auf eine neue Version.
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js', { updateViaCache: 'none' })
      .then((reg) => {
        reg.update().catch(() => {});
        // Beim Zurückkehren aus dem Hintergrund (z.B. App auf iPhone neu geöffnet)
        // aktiv nach einer neueren Version fragen, statt nur passiv zu warten.
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') reg.update().catch(() => {});
        });
      })
      .catch(() => {});
  });

  // Sobald ein neuer Service Worker die Kontrolle übernimmt (nachdem er via
  // skipWaiting()/clients.claim() aktiv wurde), die Seite einmal automatisch neu
  // laden, damit wirklich der neue app.js/index.html-Stand angezeigt wird.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (swReloading) return;
    swReloading = true;
    window.location.reload();
  });
}

window.addEventListener('online', () => document.getElementById('offline-badge').classList.add('hidden'));
window.addEventListener('offline', () => document.getElementById('offline-badge').classList.remove('hidden'));
if (!navigator.onLine) document.getElementById('offline-badge').classList.remove('hidden');
