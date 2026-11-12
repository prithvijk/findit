
'use strict';

/* ---------- 1. CONFIG ---------- */

// Map uses Leaflet + OpenStreetMap (free, no API key needed).
// MAP_CENTER is only the approximate centre of Moodabidri town, used as a starting view.
// Replace it with verified MITE campus coordinates when you have them.
const MAP_CENTER = [13.068, 74.995]; // [latitude, longitude]
const MAP_ZOOM = 16;
const MAP_TILES = {
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
};

const KEYS = { reports: 'campusfind_reports_v1', claims: 'campusfind_claims_v1' };
const PAGES = ['home', 'browse', 'report', 'matches', 'map', 'admin'];

// Icon paths use a 24x24 grid. They are reused for placeholder item images.
const CATEGORIES = [
  { name: 'Electronics', icon: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M12 18h.01"/>' },
  { name: 'ID & Cards', icon: '<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="12" r="2"/><path d="M13 10h6M13 14h5"/>' },
  { name: 'Books & Stationery', icon: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>' },
  { name: 'Bags', icon: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>' },
  { name: 'Keys', icon: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="M10.7 12.3 21 2M16 7l3 3"/>' },
  { name: 'Clothing', icon: '<path d="M20.4 5.4 16 3a4 4 0 0 1-8 0L3.6 5.4a1 1 0 0 0-.5 1.2l1.3 3.4a1 1 0 0 0 1 .6H7v9a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-9h1.6a1 1 0 0 0 1-.6l1.3-3.4a1 1 0 0 0-.5-1.2z"/>' },
  { name: 'Wallet & Money', icon: '<path d="M20 12V8H6a2 2 0 0 1 0-4h12v4"/><path d="M4 6v12a2 2 0 0 0 2 2h14v-4"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>' },
  { name: 'Accessories', icon: '<path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>' },
  { name: 'Other', icon: '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>' }
];

// One shared list used by the directory, the map and the report-form location selector.
// `coords` is intentionally null: add verified { lat: 0.0, lng: 0.0 } values yourself.
// Tip: click anywhere on the Geographical Map to see the latitude/longitude at that point.
const BUILDINGS = [
  { id: 'main-entrance', name: 'Main Entrance', type: 'Access', coords: null,
    info: 'Main gate area of the campus. Ask the security staff at the gate if something was handed in nearby.' },
  { id: 'academic-blocks', name: 'Academic Blocks', type: 'Academic', coords: null,
    info: 'Classrooms, labs and department areas. Items are often left behind in classrooms, corridors and labs.' },
  { id: 'library', name: 'Library', type: 'Academic', coords: null,
    info: 'Reading halls and study areas. Check the library help desk for items left on tables.' },
  { id: 'canteen', name: 'Canteen / Food Court', type: 'Food', coords: null,
    info: 'Dining and snack area. Commonly misplaced items include ID cards, bottles and phones.' },
  { id: 'auditorium', name: 'Auditorium', type: 'Events', coords: null,
    info: 'Used for seminars, cultural programmes and events. Items are often left on seats after events.' },
  { id: 'medical-centre', name: 'Medical Centre', type: 'Services', coords: null,
    info: 'Campus first-aid and health services area.' },
  { id: 'stationery-shop', name: 'Stationery Shop', type: 'Services', coords: null,
    info: 'Campus shop for stationery and basic supplies.' },
  { id: 'parking', name: 'Parking Area', type: 'Access', coords: null,
    info: 'Vehicle parking. Keys, helmets and bike accessories are often reported here.' },
  { id: 'hostels', name: 'Hostel Areas', type: 'Residence', coords: null,
    info: 'Student residence areas, including common rooms and corridors.' }
];
const LOCATIONS = BUILDINGS.map(b => b.name);

/* ---------- 2. HELPERS ---------- */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// Escape user text before inserting it into HTML (prevents script injection).
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-');
const isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const todayISO = () => toISO(new Date());
function daysAgoISO(n) { const d = new Date(); d.setDate(d.getDate() - n); return toISO(d); }
function parseISO(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function daysBetween(a, b) { return Math.round((parseISO(b) - parseISO(a)) / 86400000); }
function formatDate(s) { return parseISO(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
function maskEmail(email) {
  const [user, domain] = String(email).split('@');
  return (user ? user[0] : '') + '***@' + (domain || '');
}

const ICONS = {
  pin: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  cal: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
  check: '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>'
};

// Placeholder picture (inline SVG) used when a report has no photo.
function placeholderImage(category) {
  const c = CATEGORIES.find(x => x.name === category) || CATEGORIES[CATEGORIES.length - 1];
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 140">' +
    '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e8edff"/><stop offset="1" stop-color="#efe9ff"/></linearGradient></defs>' +
    '<rect width="200" height="140" fill="url(#g)"/>' +
    '<g transform="translate(76 46) scale(2)" fill="none" stroke="#3b5bdb" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + c.icon + '</g></svg>';
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
const imgOf = r => r.image || placeholderImage(r.category);

function toast(message, type = 'success') {
  const box = $('#toasts');
  const t = document.createElement('div');
  t.className = 'toast toast-' + type;
  t.setAttribute('role', type === 'error' ? 'alert' : 'status');
  t.textContent = message;
  box.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3600);
}

function setLoading(btn, loading) {
  btn.classList.toggle('loading', loading);
  btn.disabled = loading;
}

/* ---------- 3. STORAGE (localStorage) ---------- */

const state = {
  reports: [],
  claims: [],
  reportMode: 'lost',
  pendingImage: null,
  submitting: false,
  pendingReport: null,
  currentPage: null,
  selectedBuilding: null,
  mapTab: 'directory',
  map: null
};

const Store = {
  read(key, fallback) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch (e) { return fallback; }
  },
  write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { return false; }
  },
  load() {
    const reports = this.read(KEYS.reports, null);
    const claims = this.read(KEYS.claims, null);
    if (Array.isArray(reports) && Array.isArray(claims)) {
      state.reports = reports; state.claims = claims;
    } else {
      seedDemoData();
    }
  },
  save() {
    const ok = this.write(KEYS.reports, state.reports) && this.write(KEYS.claims, state.claims);
    if (!ok) toast('Could not save to browser storage. It may be full or disabled.', 'error');
    return ok;
  }
};

/* ---------- 4. SEED DATA ---------- */

function seedDemoData() {
  const mk = (id, type, name, category, description, location, daysAgo, reporter, email, extra = {}) => ({
    id, type, name, category, description, location,
    date: daysAgoISO(daysAgo),
    image: null,
    holding: type === 'found' ? (extra.holding || 'Department office') : '',
    reporter, email,
    status: extra.status || 'Open',
    createdAt: new Date(Date.now() - daysAgo * 86400000 - (extra.offset || 0)).toISOString()
  });
  state.reports = [
    mk('L-1001', 'lost', 'Black HP Laptop Charger', 'Electronics', 'Black HP laptop charger 65W in a small black pouch. White tape wrapped near the plug.', 'Library', 2, 'Ananya R.', 'ananya.demo@example.com'),
    mk('F-1002', 'found', 'HP Laptop Adapter', 'Electronics', 'Black HP laptop adapter with white tape near the plug, found on a reading table.', 'Library', 1, 'Library Staff', 'library.demo@example.com', { holding: 'Library help desk' }),
    mk('L-1003', 'lost', 'Student ID Card', 'ID & Cards', 'MITE student ID card on a blue lanyard, Computer Science department.', 'Canteen / Food Court', 3, 'Rahul K.', 'rahul.demo@example.com'),
    mk('F-1004', 'found', 'ID Card with Blue Lanyard', 'ID & Cards', 'Student ID card on a blue lanyard found near the billing counter.', 'Canteen / Food Court', 2, 'Canteen Staff', 'canteen.demo@example.com', { holding: 'Canteen billing counter', status: 'Claim Pending', offset: 1000 }),
    mk('L-1005', 'lost', 'Navy Blue Backpack', 'Bags', 'Navy blue backpack with notebooks and a calculator inside. Yellow zip pullers.', 'Academic Blocks', 4, 'Meera S.', 'meera.demo@example.com'),
    mk('F-1006', 'found', 'Grey Folding Umbrella', 'Other', 'Grey folding umbrella with a wooden handle, left near the bike stand.', 'Parking Area', 1, 'Security Staff', 'security.demo@example.com', { holding: 'Security cabin', offset: 2000 }),
    mk('F-1007', 'found', 'Casio Scientific Calculator', 'Books & Stationery', 'Casio fx-991 scientific calculator with initials scratched on the back.', 'Auditorium', 3, 'Event Volunteer', 'volunteer.demo@example.com', { holding: 'Auditorium office' }),
    mk('L-1008', 'lost', 'Casio fx-991 Calculator', 'Books & Stationery', 'Grey Casio scientific calculator fx-991 with initials on the back.', 'Academic Blocks', 5, 'Karthik P.', 'karthik.demo@example.com'),
    mk('L-1009', 'lost', 'Bike Key with Red Keychain', 'Keys', 'Honda bike key with a red rubber keychain.', 'Parking Area', 2, 'Sneha D.', 'sneha.demo@example.com', { offset: 3000 }),
    mk('F-1010', 'found', 'Keys with Red Keychain', 'Keys', 'Two keys on a red rubber keychain, one looks like a bike key.', 'Parking Area', 1, 'Security Staff', 'security.demo@example.com', { holding: 'Security cabin', offset: 4000 }),
    mk('F-1011', 'found', 'White Earbuds Case', 'Electronics', 'White wireless earbuds charging case found in the common room.', 'Hostel Areas', 2, 'Hostel Warden Office', 'hostel.demo@example.com', { holding: 'Hostel office', offset: 5000 }),
    mk('L-1012', 'lost', 'Brown Leather Wallet', 'Wallet & Money', 'Brown leather wallet with a bus pass and some cash.', 'Medical Centre', 8, 'Vikram N.', 'vikram.demo@example.com', { status: 'Returned' }),
    mk('F-1013', 'found', 'Brown Wallet', 'Wallet & Money', 'Brown leather wallet found near the medical centre entrance.', 'Medical Centre', 8, 'Nurse Desk', 'medical.demo@example.com', { holding: 'Medical centre desk', status: 'Returned', offset: 6000 })
  ];
  state.claims = [{
    id: 'C-2001', reportId: 'F-1004', name: 'Rahul K.', email: 'rahul.demo@example.com',
    details: 'Blue lanyard with my name and CSE department printed on the card.',
    reason: 'This is my ID card, I lost it at the canteen on Monday.',
    status: 'Pending', createdAt: new Date(Date.now() - 86400000).toISOString()
  }];
  Store.save();
}

/* ---------- 5. MATCHING (demo algorithm) ---------- */

const STOP_WORDS = new Set(['the', 'and', 'with', 'for', 'near', 'found', 'lost', 'left', 'from', 'was', 'are', 'has', 'have', 'this', 'that', 'some', 'inside', 'small', 'one', 'two', 'looks', 'like', 'its', 'any']);
const SYNONYMS = { adapter: 'charger', earbuds: 'earphones', earbud: 'earphones', airpods: 'earphones', bag: 'backpack', rucksack: 'backpack', cellphone: 'phone', mobile: 'phone', smartphone: 'phone', purse: 'wallet', specs: 'glasses', spectacles: 'glasses', lanyard: 'lanyard', idcard: 'card', id: 'card' };

function tokens(text) {
  const out = new Set();
  String(text).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).forEach(w => {
    if (w.length < 2 || STOP_WORDS.has(w)) return;
    out.add(SYNONYMS[w] || w);
  });
  return out;
}

/*
  Demo matching score (0-100):
    category   30 points  same category
    keywords   40 points  shared words in name + description
    location   20 points  same campus location
    date       10 points  found date is close to the lost date
  Replace this function with a call to a real AI service later.
*/
function computeMatch(lost, found) {
  const reasons = [];
  const parts = { category: 0, keywords: 0, location: 0, date: 0 };

  if (lost.category === found.category) {
    parts.category = 30;
    reasons.push('Same category: ' + lost.category);
  }

  const a = tokens(lost.name + ' ' + lost.description);
  const b = tokens(found.name + ' ' + found.description);
  const shared = [...a].filter(w => b.has(w));
  const ratio = shared.length / Math.max(1, Math.min(a.size, b.size));
  parts.keywords = Math.round(Math.min(1, ratio * 1.25) * 40);
  if (shared.length) reasons.push(shared.length + ' shared keyword' + (shared.length > 1 ? 's' : '') + ': ' + shared.slice(0, 5).join(', '));

  if (lost.location === found.location) {
    parts.location = 20;
    reasons.push('Both reported at ' + lost.location);
  }

  const gap = daysBetween(lost.date, found.date); // positive = found after lost
  if (gap >= -1 && gap <= 7) {
    parts.date = 10;
    reasons.push(gap <= 0 ? 'Reported on about the same day' : 'Found ' + gap + ' day' + (gap > 1 ? 's' : '') + ' after it was lost');
  } else if (gap > 7 && gap <= 14) {
    parts.date = 5;
    reasons.push('Found within two weeks of the loss');
  }

  const score = parts.category + parts.keywords + parts.location + parts.date;
  return { lost, found, score, parts, reasons };
}

function getMatches(minScore = 40) {
  const open = r => r.status !== 'Returned';
  const lostList = state.reports.filter(r => r.type === 'lost' && open(r));
  const foundList = state.reports.filter(r => r.type === 'found' && open(r));
  const out = [];
  lostList.forEach(l => foundList.forEach(f => {
    const m = computeMatch(l, f);
    if (m.score >= minScore) out.push(m);
  }));
  return out.sort((x, y) => y.score - x.score);
}

/* ---------- 6. RENDERING ---------- */

const findReport = id => state.reports.find(r => r.id === id);
const canClaim = r => r.type === 'found' && (r.status === 'Open' || r.status === 'Claim Pending');

function animateNumber(el, to) {
    const from = Number(el.dataset.value || 0);
    el.dataset.value = to;
    if (from === to || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        el.textContent = to;
        return;
    }
    const start = performance.now();
    const duration = 600;
    function tick(now) {
        const p = Math.min(1, (now - start) / duration);
        el.textContent = Math.round(from + (to - from) * p);
        if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}

function renderStats() {
  const stats = {
    total: state.reports.length,
    found: state.reports.filter(r => r.type === 'found').length,
    returned: state.reports.filter(r => r.status === 'Returned').length,
    matches: getMatches(70).length,
    'a-lost': state.reports.filter(r => r.type === 'lost').length,
    'a-found': state.reports.filter(r => r.type === 'found').length,
    'a-pending': state.claims.filter(c => c.status === 'Pending').length,
    'a-returned': state.reports.filter(r => r.status === 'Returned').length
  };
  $$('[data-stat]').forEach(el => animateNumber(el, stats[el.dataset.stat] ?? 0));
}

function itemCard(r, showDesc) {
  return `<article class="card item-card">
    <div class="item-img">
      <img src="${esc(imgOf(r))}" alt="${esc(r.name)}" loading="lazy">
      <span class="badge badge-${r.type}">${r.type === 'lost' ? 'Lost' : 'Found'}</span>
    </div>
    <div class="item-body">
      <div class="item-meta"><span class="chip">${esc(r.category)}</span><span class="status status-${slug(r.status)}">${esc(r.status)}</span></div>
      <h3>${esc(r.name)}</h3>
      ${showDesc ? `<p class="desc">${esc(r.description)}</p>` : ''}
      <ul class="item-info">
        <li>${ICONS.pin} ${esc(r.location)}</li>
        <li>${ICONS.cal} ${esc(formatDate(r.date))}</li>
      </ul>
      <button class="btn btn-outline btn-block" data-action="view" data-id="${esc(r.id)}">View Details</button>
    </div>
  </article>`;
}

function renderRecent() {
  const recent = [...state.reports].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);
  $('#recent-grid').innerHTML = recent.map(r => itemCard(r, false)).join('');
}

function miniItem(r) {
  return `<div class="match-side">
    <img src="${esc(imgOf(r))}" alt="${esc(r.name)}">
    <div>
      <span class="badge badge-${r.type}">${r.type === 'lost' ? 'Lost' : 'Found'}</span>
      <h4>${esc(r.name)}</h4>
      <small>${esc(r.location)} · ${esc(formatDate(r.date))}</small>
      <small>${esc(r.category)}</small>
    </div>
  </div>`;
}

function matchCard(m) {
  return `<article class="card match-card">
    ${miniItem(m.lost)}
    <div class="match-center">
      <div class="ring" style="--pct:${m.score}"><span>${m.score}%</span></div>
      <span>match</span>
    </div>
    ${miniItem(m.found)}
    <div class="match-why">
      <div>
        <div class="why-label">Why it may match</div>
        <ul class="reason-list">${m.reasons.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      </div>
      <button class="btn btn-primary" data-action="match" data-lost="${esc(m.lost.id)}" data-found="${esc(m.found.id)}">View Match</button>
    </div>
  </article>`;
}

function renderHomeMatches() {
  const top = getMatches(40).slice(0, 2);
  $('#home-matches').innerHTML = top.length
    ? top.map(matchCard).join('')
    : '<p class="empty-inline">No match suggestions yet. Submit a lost or found report to get started.</p>';
}

function renderMatchesPage() {
  const min = Number($('#match-min').value);
  const list = getMatches(min);
  $('#match-list').innerHTML = list.map(matchCard).join('');
  $('#match-empty').hidden = list.length > 0;
}

function renderAll() {
  renderStats();
  renderRecent();
  renderHomeMatches();
  renderBrowse();
  renderMatchesPage();
  renderAdmin();
  renderDirectory();
  if (state.selectedBuilding) renderBuildingDetail(state.selectedBuilding);
}

/* ---------- 7. BROWSE ---------- */

function fillSelect(select, values, allLabel, selected) {
  const opts = (allLabel ? [`<option value="all">${esc(allLabel)}</option>`] : []).concat(
    values.map(v => `<option value="${esc(v)}">${esc(v)}</option>`));
  select.innerHTML = opts.join('');
  if (selected) select.value = selected;
}

function getFilters() {
  return {
    q: $('#flt-search').value,
    type: $('#flt-type').value,
    category: $('#flt-category').value,
    location: $('#flt-location').value,
    date: $('#flt-date').value
  };
}

function filterReports(f) {
  const words = f.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const maxAge = { today: 0, week: 7, month: 30 }[f.date];
  return state.reports.filter(r => {
    if (f.type !== 'all' && r.type !== f.type) return false;
    if (f.category !== 'all' && r.category !== f.category) return false;
    if (f.location !== 'all' && r.location !== f.location) return false;
    if (maxAge !== undefined && daysBetween(r.date, todayISO()) > maxAge) return false;
    if (words.length) {
      const hay = [r.name, r.description, r.category, r.location].join(' ').toLowerCase();
      if (!words.every(w => hay.includes(w))) return false;
    }
    return true;
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function renderBrowse() {
  const list = filterReports(getFilters());
  $('#browse-grid').innerHTML = list.map(r => itemCard(r, true)).join('');
  $('#browse-empty').hidden = list.length > 0;
  $('#browse-count').textContent = list.length
    ? `Showing ${list.length} of ${state.reports.length} report${state.reports.length === 1 ? '' : 's'}`
    : '';
}

function clearFilters() {
  $('#flt-search').value = '';
  ['#flt-type', '#flt-category', '#flt-location', '#flt-date'].forEach(s => { $(s).value = 'all'; });
  renderBrowse();
}

/* ---------- 8. REPORT FORM ---------- */

function setErrors(form, errors) {
  $$('[data-error-for]', form).forEach(el => { el.textContent = errors[el.dataset.errorFor] || ''; });
  $$('input, select, textarea', form).forEach(inp => {
    if (inp.type === 'hidden') return;
    inp.classList.toggle('invalid', Boolean(errors[inp.name]));
    inp.setAttribute('aria-invalid', errors[inp.name] ? 'true' : 'false');
  });
  const first = Object.keys(errors)[0];
  if (first) { const el = form.elements[first]; if (el && el.focus) el.focus(); }
}

function formValues(form) {
  const v = {};
  new FormData(form).forEach((val, key) => { if (typeof val === 'string') v[key] = val.trim(); });
  return v;
}

function setReportMode(mode) {
  state.reportMode = mode;
  const lost = mode === 'lost';
  $('#tab-lost').classList.toggle('active', lost);
  $('#tab-found').classList.toggle('active', !lost);
  $('#tab-lost').setAttribute('aria-selected', String(lost));
  $('#tab-found').setAttribute('aria-selected', String(!lost));
  $('#label-location').innerHTML = (lost ? 'Last seen location' : 'Found location') + ' <span class="req">*</span>';
  $('#label-date').innerHTML = (lost ? 'Date lost' : 'Date found') + ' <span class="req">*</span>';
  $('#holding-field').hidden = lost;
  $('#report-submit .btn-label').textContent = lost ? 'Submit Lost Report' : 'Submit Found Report';
  setErrors($('#report-form'), {});
}

function clearPhoto() {
  state.pendingImage = null;
  $('#f-photo').value = '';
  $('#photo-preview').hidden = true;
  $('#photo-preview-img').removeAttribute('src');
}

function resetReportView() {
  $('#report-form').reset();
  clearPhoto();
  setErrors($('#report-form'), {});
  $('#report-form').hidden = false;
  $('.segmented', $('#report-card')).hidden = false;
  $('#report-success').hidden = true;
  $('#f-date').max = todayISO();
  setReportMode('lost');
}

// Shrinks the photo so it fits comfortably in localStorage.
function processImage(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Please choose an image file (JPG, PNG or WebP).'));
    if (file.size > 5 * 1024 * 1024) return reject(new Error('That image is larger than 5 MB.'));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That file is not a valid image.'));
      img.onload = () => {
        const scale = Math.min(1, 640 / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function handlePhotoChange(input) {
  const form = $('#report-form');
  const file = input.files && input.files[0];
  if (!file) { clearPhoto(); return; }
  try {
    state.pendingImage = await processImage(file);
    $('#photo-preview-img').src = state.pendingImage;
    $('#photo-preview').hidden = false;
    $('[data-error-for="photo"]', form).textContent = '';
  } catch (err) {
    clearPhoto();
    $('[data-error-for="photo"]', form).textContent = err.message;
  }
}

function validateReport(v, mode) {
  const e = {};
  if (!v.itemName || v.itemName.length < 2) e.itemName = 'Enter the item name.';
  if (!v.category) e.category = 'Choose a category.';
  if (!v.description || v.description.length < 10) e.description = 'Describe the item in at least 10 characters.';
  if (!v.location) e.location = 'Choose a location.';
  if (!v.date) e.date = 'Choose a date.';
  else if (v.date > todayISO()) e.date = 'The date cannot be in the future.';
  if (mode === 'found' && (!v.holding || v.holding.length < 2)) e.holding = 'Say where the item is being held now.';
  if (!v.student || v.student.length < 2) e.student = 'Enter your name.';
  if (!v.email) e.email = 'Enter your email address.';
  else if (!isEmail(v.email)) e.email = 'Enter a valid email address.';
  return e;
}

function handleReportSubmit(form) {
  if (state.submitting) return;
  const mode = state.reportMode;
  const v = formValues(form);
  const errors = validateReport(v, mode);
  if (Object.keys(errors).length) {
    setErrors(form, errors);
    toast('Please fix the highlighted fields.', 'error');
    return;
  }
  setErrors(form, {});

  const duplicate = state.reports.some(r => r.type === mode && r.email.toLowerCase() === v.email.toLowerCase() &&
    r.name.toLowerCase() === v.itemName.toLowerCase() && r.location === v.location && r.date === v.date);
  if (duplicate) {
    toast('You already submitted this report.', 'error');
    return;
  }

  const btn = $('#report-submit');
  state.submitting = true;
  setLoading(btn, true);

  setTimeout(() => {
    const report = {
      id: (mode === 'lost' ? 'L-' : 'F-') + Date.now().toString(36).toUpperCase(),
      type: mode,
      name: v.itemName,
      category: v.category,
      description: v.description,
      location: v.location,
      date: v.date,
      image: state.pendingImage,
      holding: mode === 'found' ? v.holding : '',
      reporter: v.student,
      email: v.email,
      status: 'Open',
      createdAt: new Date().toISOString()
    };
    state.reports.push(report);
    if (!Store.save()) {
      // Most likely the photo made the data too big: roll back and explain.
      state.reports.pop();
      state.submitting = false;
      setLoading(btn, false);
      return;
    }
    state.submitting = false;
    setLoading(btn, false);
    renderAll();
    showReportSuccess(report);
    toast('Report submitted successfully.');
  }, 600);
}

function showReportSuccess(report) {
  const top = getMatches(40).filter(m => m.lost.id === report.id || m.found.id === report.id)[0];
  const box = $('#report-success');
  box.innerHTML = `
    <div class="success-icon">${ICONS.check}</div>
    <h2>Your ${report.type} report is in</h2>
    <p>Thank you, ${esc(report.reporter)}. Your report is now visible on the Browse Items page.</p>
    <dl class="dl">
      <dt>Report ID</dt><dd>${esc(report.id)}</dd>
      <dt>Item</dt><dd>${esc(report.name)}</dd>
      <dt>Status</dt><dd><span class="status status-open">Open</span></dd>
    </dl>
    ${top
      ? `<div class="notice notice-info">The demo matcher found a possible match at <strong>${top.score}%</strong>. Check it on the AI Matching page.</div>`
      : '<div class="notice notice-info">No match yet. Matches update whenever new reports come in.</div>'}
    <div class="btn-row">
      <button class="btn btn-primary" data-action="nav" data-page="browse">View in Browse Items</button>
      <button class="btn btn-outline" data-action="nav" data-page="matches">See AI matches</button>
      <button class="btn btn-ghost" data-action="report-another">Report another item</button>
    </div>`;
  $('#report-form').hidden = true;
  $('.segmented', $('#report-card')).hidden = true;
  box.hidden = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goToReport(mode, location) {
  state.pendingReport = { mode: mode || 'lost', location: location || '' };
  navigate('report');
}

/* ---------- 9. DETAILS, MATCH VIEW & CLAIMS ---------- */

let lastFocus = null;
function openModal(html, wide) {
  const modal = $('#modal');
  if (modal.hidden) lastFocus = document.activeElement;
  $('#modal-body').innerHTML = html;
  modal.classList.toggle('wide', Boolean(wide));
  modal.hidden = false;
  document.body.classList.add('no-scroll');
  $('.modal-close', modal).focus();
}
function closeModal() {
  const modal = $('#modal');
  if (modal.hidden) return;
  modal.hidden = true;
  document.body.classList.remove('no-scroll');
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}

function openDetails(id, opts = {}) {
  const r = findReport(id);
  if (!r) { toast('That report could not be found.', 'error'); return; }
  const admin = Boolean(opts.admin);
  const claims = state.claims.filter(c => c.reportId === id);
  const rows = [
    ['Category', r.category],
    [r.type === 'lost' ? 'Last seen at' : 'Found at', r.location],
    [r.type === 'lost' ? 'Date lost' : 'Date found', formatDate(r.date)]
  ];
  if (r.type === 'found' && r.holding) rows.push(['Currently held at', r.holding]);
  rows.push(['Reported by', admin ? `${r.reporter} (${r.email})` : `${r.reporter} (${maskEmail(r.email)})`]);
  rows.push(['Report ID', r.id]);

  let claimBlock = '';
  if (r.type === 'found' && claims.length) {
    claimBlock = `<h4>Claims on this item</h4><ul class="claim-list">${claims.map(c =>
      `<li><span>${admin ? esc(c.name) + ' · ' + esc(c.email) : 'Claim ' + esc(c.id)}</span><span class="status status-${slug(c.status)}">${esc(c.status)}</span></li>`).join('')}</ul>`;
  }

  const actions = [];
  if (canClaim(r) && !admin) actions.push(`<button class="btn btn-primary" data-action="claim" data-id="${esc(r.id)}">Claim This Item</button>`);
  if (r.type === 'lost' && r.status !== 'Returned' && !admin) actions.push(`<button class="btn btn-primary" data-action="report-found-hint">I found this item</button>`);
  if (admin && r.status !== 'Returned') actions.push(`<button class="btn btn-success" data-action="return" data-id="${esc(r.id)}">Mark as Returned</button>`);
  actions.push('<button class="btn btn-outline" data-action="close-modal">Close</button>');

  openModal(`
    <img class="detail-img" src="${esc(imgOf(r))}" alt="${esc(r.name)}">
    <div class="detail-head">
      <span class="badge badge-${r.type}">${r.type === 'lost' ? 'Lost' : 'Found'}</span>
      <span class="status status-${slug(r.status)}">${esc(r.status)}</span>
    </div>
    <h2 id="modal-title-anchor">${esc(r.name)}</h2>
    <p>${esc(r.description)}</p>
    <dl class="dl">${rows.map(([k, val]) => `<dt>${esc(k)}</dt><dd>${esc(val)}</dd>`).join('')}</dl>
    ${claimBlock}
    <div class="modal-actions">${actions.join('')}</div>`);
}

function openMatch(lostId, foundId) {
  const l = findReport(lostId), f = findReport(foundId);
  if (!l || !f) { toast('That match is no longer available.', 'error'); return; }
  const m = computeMatch(l, f);
  const bar = (label, val, max) => `<div class="score-row"><span>${label}</span><div class="bar"><i style="width:${Math.round(val / max * 100)}%"></i></div><span>${val}/${max}</span></div>`;
  const box = r => `<div class="box">
    <span class="badge badge-${r.type}">${r.type === 'lost' ? 'Lost' : 'Found'}</span>
    <img src="${esc(imgOf(r))}" alt="${esc(r.name)}">
    <h4>${esc(r.name)}</h4>
    <p>${esc(r.description)}</p>
    <small>${esc(r.location)} · ${esc(formatDate(r.date))}</small>
  </div>`;
  openModal(`
    <h2 id="modal-title-anchor">Match details · ${m.score}%</h2>
    <div class="compare">${box(l)}${box(f)}</div>
    <h4>Score breakdown</h4>
    ${bar('Category', m.parts.category, 30)}${bar('Keywords', m.parts.keywords, 40)}${bar('Location', m.parts.location, 20)}${bar('Date', m.parts.date, 10)}
    <div class="why-label" style="margin-top:14px">Why it may match</div>
    <ul class="reason-list">${m.reasons.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
    <p style="margin-top:14px;font-size:.85rem">Demo score from keywords, category, location and date. No AI model or image recognition is used.</p>
    <div class="modal-actions">
      ${canClaim(f) ? `<button class="btn btn-primary" data-action="claim" data-id="${esc(f.id)}">Claim the found item</button>` : ''}
      <button class="btn btn-outline" data-action="close-modal">Close</button>
    </div>`, true);
}

function openClaimForm(id) {
  const r = findReport(id);
  if (!r || !canClaim(r)) { toast('This item cannot be claimed right now.', 'error'); return; }
  openModal(`
    <h2 id="modal-title-anchor">Claim this item</h2>
    <p>Claiming <strong>${esc(r.name)}</strong> (${esc(r.location)}). The admin reviews every claim before the item is released.</p>
    <form id="claim-form" data-id="${esc(r.id)}" novalidate>
      <div class="form-grid">
        <div class="field full"><label for="c-name">Your name <span class="req">*</span></label>
          <input id="c-name" name="name" type="text" maxlength="60" autocomplete="name"><small class="error" data-error-for="name"></small></div>
        <div class="field full"><label for="c-email">Email <span class="req">*</span></label>
          <input id="c-email" name="email" type="email" maxlength="100" autocomplete="email"><small class="error" data-error-for="email"></small></div>
        <div class="field full"><label for="c-details">Identifying details <span class="req">*</span></label>
          <textarea id="c-details" name="details" rows="3" maxlength="400" placeholder="Something only the owner would know: marks, contents, colour of the pouch…"></textarea><small class="error" data-error-for="details"></small></div>
        <div class="field full"><label for="c-reason">Reason for claiming <span class="req">*</span></label>
          <textarea id="c-reason" name="reason" rows="2" maxlength="300" placeholder="e.g. I lost it near the library on Monday"></textarea><small class="error" data-error-for="reason"></small></div>
      </div>
      <div class="modal-actions">
        <button type="submit" class="btn btn-primary" id="claim-submit"><span class="btn-label">Submit Claim</span><span class="spinner" aria-hidden="true"></span></button>
        <button type="button" class="btn btn-outline" data-action="close-modal">Cancel</button>
      </div>
    </form>`);
  $('#c-name').focus();
}

function handleClaimSubmit(form) {
  if (state.submitting) return;
  const r = findReport(form.dataset.id);
  if (!r || !canClaim(r)) { toast('This item cannot be claimed right now.', 'error'); return; }
  const v = formValues(form);
  const e = {};
  if (!v.name || v.name.length < 2) e.name = 'Enter your name.';
  if (!v.email) e.email = 'Enter your email.';
  else if (!isEmail(v.email)) e.email = 'Enter a valid email address.';
  if (!v.details || v.details.length < 10) e.details = 'Give at least 10 characters of identifying details.';
  if (!v.reason || v.reason.length < 10) e.reason = 'Tell us why you are claiming it (10+ characters).';
  if (!e.email && state.claims.some(c => c.reportId === r.id && c.status === 'Pending' && c.email.toLowerCase() === v.email.toLowerCase())) {
    e.email = 'You already have a pending claim on this item.';
  }
  if (Object.keys(e).length) { setErrors(form, e); return; }

  const btn = $('#claim-submit');
  state.submitting = true;
  setLoading(btn, true);
  setTimeout(() => {
    const claim = {
      id: 'C-' + Date.now().toString(36).toUpperCase(),
      reportId: r.id, name: v.name, email: v.email, details: v.details, reason: v.reason,
      status: 'Pending', createdAt: new Date().toISOString()
    };
    state.claims.push(claim);
    const prevStatus = r.status;
    if (r.status === 'Open') r.status = 'Claim Pending';
    if (!Store.save()) { state.claims.pop(); r.status = prevStatus; }
    else {
      renderAll();
      toast('Claim submitted. The admin will review it.');
      openModal(`
        <div class="success-panel">
          <div class="success-icon">${ICONS.check}</div>
          <h2 id="modal-title-anchor">Claim submitted</h2>
          <p>Your claim for <strong>${esc(r.name)}</strong> is waiting for admin review.</p>
          <dl class="dl"><dt>Claim ID</dt><dd>${esc(claim.id)}</dd><dt>Status</dt><dd><span class="status status-pending">Pending</span></dd></dl>
          <p>Use "Check my claim status" on the Browse Items page to follow it.</p>
          <div class="modal-actions" style="justify-content:center"><button class="btn btn-primary" data-action="close-modal">Done</button></div>
        </div>`);
    }
    state.submitting = false;
  }, 600);
}

function openMyClaims(email) {
  const list = email ? state.claims.filter(c => c.email.toLowerCase() === email.toLowerCase()) : null;
  let results = '';
  if (list) {
    results = list.length
      ? `<ul class="claim-list">${list.map(c => {
          const r = findReport(c.reportId);
          const hint = c.status === 'Approved' && r && r.holding ? `<small>Collect from: ${esc(r.holding)}</small>` : '';
          return `<li><span><strong>${esc(r ? r.name : 'Item removed')}</strong><br><small>${esc(c.id)}</small> ${hint}</span><span class="status status-${slug(c.status)}">${esc(c.status)}</span></li>`;
        }).join('')}</ul>`
      : '<p class="empty-inline">No claims found for that email.</p>';
  }
  openModal(`
    <h2 id="modal-title-anchor">Check claim status</h2>
    <p>Enter the email address you used when claiming.</p>
    <form id="my-claims-form" novalidate>
      <div class="field"><label for="mc-email">Email</label>
        <input id="mc-email" name="email" type="email" value="${esc(email || '')}"><small class="error" data-error-for="email"></small></div>
      <div class="modal-actions"><button type="submit" class="btn btn-primary">Show my claims</button></div>
    </form>
    <div style="margin-top:16px">${results}</div>`);
}

/* ---------- 10. ADMIN ---------- */

function renderAdmin() {
  const reports = [...state.reports].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  $('#admin-reports').innerHTML = reports.length ? reports.map(r => `<tr>
    <td><strong>${esc(r.name)}</strong></td>
    <td><span class="badge badge-${r.type}">${r.type}</span></td>
    <td>${esc(r.reporter)}</td>
    <td>${esc(r.location)}</td>
    <td>${esc(formatDate(r.date))}</td>
    <td><span class="status status-${slug(r.status)}">${esc(r.status)}</span></td>
    <td><div class="actions">
      <button class="btn btn-outline btn-sm" data-action="admin-view" data-id="${esc(r.id)}">View</button>
      <button class="btn btn-success btn-sm" data-action="return" data-id="${esc(r.id)}" ${r.status === 'Returned' ? 'disabled' : ''}>Mark Returned</button>
    </div></td></tr>`).join('') : '<tr class="empty-row"><td colspan="7">No reports yet.</td></tr>';

  const claims = [...state.claims].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  $('#admin-claims').innerHTML = claims.length ? claims.map(c => {
    const r = findReport(c.reportId);
    const open = c.status === 'Pending' && r && r.status !== 'Returned';
    return `<tr>
      <td><strong>${esc(r ? r.name : 'Removed item')}</strong><br><small>${esc(c.id)}</small></td>
      <td>${esc(c.name)}<br><small>${esc(c.email)}</small></td>
      <td><div class="cell-clip" title="${esc(c.details)}">${esc(c.details)}</div></td>
      <td><div class="cell-clip" title="${esc(c.reason)}">${esc(c.reason)}</div></td>
      <td><span class="status status-${slug(c.status)}">${esc(c.status)}</span></td>
      <td>${open ? `<div class="actions">
        <button class="btn btn-success btn-sm" data-action="approve" data-id="${esc(c.id)}">Approve</button>
        <button class="btn btn-danger btn-sm" data-action="reject" data-id="${esc(c.id)}">Reject</button></div>` : '<small>No action</small>'}</td></tr>`;
  }).join('') : '<tr class="empty-row"><td colspan="6">No claims submitted yet.</td></tr>';
}

function markReturned(id) {
  const r = findReport(id);
  if (!r || r.status === 'Returned') return;
  r.status = 'Returned';
  r.returnedAt = new Date().toISOString();
  Store.save();
  closeModal();
  renderAll();
  toast(`"${r.name}" marked as returned.`);
}

function decideClaim(id, decision) {
  const c = state.claims.find(x => x.id === id);
  if (!c || c.status !== 'Pending') return;
  const r = findReport(c.reportId);
  c.status = decision;
  c.decidedAt = new Date().toISOString();
  if (decision === 'Approved') {
    if (r) r.status = 'Claim Approved';
    state.claims.forEach(o => {
      if (o !== c && o.reportId === c.reportId && o.status === 'Pending') { o.status = 'Rejected'; o.decidedAt = c.decidedAt; }
    });
  } else if (r && r.status === 'Claim Pending' && !state.claims.some(o => o.reportId === c.reportId && o.status === 'Pending')) {
    r.status = 'Open';
  }
  Store.save();
  renderAll();
  toast(decision === 'Approved' ? 'Claim approved. Other pending claims on this item were rejected.' : 'Claim rejected.', decision === 'Approved' ? 'success' : 'info');
}

function resetDemoData() {
  if (!window.confirm('Reset all reports and claims back to the demo data? Your submitted reports will be removed.')) return;
  try { localStorage.removeItem(KEYS.reports); localStorage.removeItem(KEYS.claims); } catch (e) { /* ignore */ }
  seedDemoData();
  clearFilters();
  renderAll();
  toast('Demo data has been reset.', 'info');
}

/* ---------- 11. CAMPUS MAP ---------- */

function reportCountAt(name) {
  const open = state.reports.filter(r => r.location === name && r.status !== 'Returned');
  return { lost: open.filter(r => r.type === 'lost').length, found: open.filter(r => r.type === 'found').length };
}

function renderDirectory() {
  const q = $('#dir-search').value.trim().toLowerCase();
  const list = BUILDINGS.filter(b => !q || (b.name + ' ' + b.type + ' ' + b.info).toLowerCase().includes(q));
  $('#dir-list').innerHTML = list.map(b => {
    const n = reportCountAt(b.name);
    return `<li><button class="dir-item ${state.selectedBuilding === b.id ? 'active' : ''}" data-action="select-building" data-id="${esc(b.id)}">
      <span>${esc(b.name)}</span><small>${n.lost + n.found} open</small></button></li>`;
  }).join('');
  $('#dir-empty').hidden = list.length > 0;
  if (!state.selectedBuilding) {
    $('#building-detail').innerHTML = '<h2>Select a location</h2><p>Choose a building from the list to see its details and the items reported there.</p>';
  }
}

function renderBuildingDetail(id) {
  const b = BUILDINGS.find(x => x.id === id);
  if (!b) return;
  const n = reportCountAt(b.name);
  $('#building-detail').innerHTML = `
    <span class="chip">${esc(b.type)}</span>
    <h2 style="margin-top:10px">${esc(b.name)}</h2>
    <p>${esc(b.info)}</p>
    <div class="detail-stats">
      <div><strong>${n.lost}</strong><small>Open lost reports</small></div>
      <div><strong>${n.found}</strong><small>Open found reports</small></div>
    </div>
    <p style="font-size:.82rem">${b.coords ? 'Map position available on the Geographical Map tab.' : 'No verified map coordinates added yet.'}</p>
    <div class="btn-row">
      <button class="btn btn-primary" data-action="browse-location" data-location="${esc(b.name)}">Browse items here</button>
      <button class="btn btn-outline" data-action="report" data-mode="lost" data-location="${esc(b.name)}">Report an item here</button>
    </div>`;
}

function selectBuilding(id) {
  state.selectedBuilding = id;
  renderDirectory();
  renderBuildingDetail(id);
}

function setMapTab(tab) {
  state.mapTab = tab;
  $('#maptab-directory').classList.toggle('active', tab === 'directory');
  $('#maptab-map').classList.toggle('active', tab === 'map');
  $('#maptab-directory').setAttribute('aria-selected', String(tab === 'directory'));
  $('#maptab-map').setAttribute('aria-selected', String(tab === 'map'));
  $('#map-directory').hidden = tab !== 'directory';
  $('#map-google').hidden = tab !== 'map';
  if (tab === 'map') initMap();
}

function showMapMessage(title, text) {
  $('#map-canvas').innerHTML = `<div class="map-placeholder"><h3>${esc(title)}</h3><p>${esc(text)}</p></div>`;
}

// Builds the Leaflet map once, the first time the Geographical Map tab is opened.
function initMap() {
  if (typeof L === 'undefined') {
    showMapMessage('Map library could not load', 'Leaflet is loaded from the internet (unpkg.com). Check your connection and reload the page.');
    return;
  }
  if (!state.map) {
    const map = L.map('map-canvas').setView(MAP_CENTER, MAP_ZOOM);
    L.tileLayer(MAP_TILES.url, { maxZoom: 19, attribution: MAP_TILES.attribution }).addTo(map);

    let placed = 0;
    BUILDINGS.forEach(b => {
      if (!b.coords) return; // never guess coordinates
      L.marker([b.coords.lat, b.coords.lng]).addTo(map)
        .bindPopup(`<strong>${esc(b.name)}</strong><br>${esc(b.type)}`)
        .on('click', () => selectBuilding(b.id));
      placed++;
    });
    $('#map-note').textContent = placed
      ? `${placed} building marker${placed === 1 ? '' : 's'} shown.`
      : 'No building markers yet. Add verified coords to BUILDINGS in script.js. Click the map to read the latitude/longitude of a point.';

    // Helper for adding coordinates: click a point to see its latitude/longitude.
    map.on('click', e => {
      L.popup().setLatLng(e.latlng)
        .setContent(`Lat ${e.latlng.lat.toFixed(6)}, Lng ${e.latlng.lng.toFixed(6)}<br><small>Copy into <code>BUILDINGS</code> only if this is a verified building location.</small>`)
        .openOn(map);
    });
    state.map = map;
  }
  // The map was hidden when created, so Leaflet needs to re-measure its size.
  setTimeout(() => state.map.invalidateSize(), 0);
}
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Your Firebase configuration (using your project context credentials)
const firebaseConfig = {
  apiKey: "AIzaSyBtHrI_bP2HMcOXCIOpNc-V4F6PBM053jc", // Get this from your Firebase Project Settings
  authDomain: "findit-ab909.firebaseapp.com",
  projectId: "findit-ab909",
  storageBucket: "findit-ab909.firebasestorage.app",
  messagingSenderId: "630526620525",
  appId: "findit-ab909" // Get this from your Firebase Project Settings
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const messageEl = document.getElementById('message');
        
        messageEl.textContent = "";

        if (!email.endsWith('@mite.ac.in')) {
            messageEl.textContent = "Please use your official @mite.ac.in email address.";
            return;
        }

        try {
            await signInWithEmailAndPassword(auth, email, password);
            toast('Logged in successfully!', 'success');
            navigate('home');
        } catch (error) {
            messageEl.textContent = error.message;
        }
    });
}

const registerBtn = document.getElementById('registerBtn');
if (registerBtn) {
    registerBtn.addEventListener('click', async () => {
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const messageEl = document.getElementById('message');
        
        messageEl.textContent = "";

        if (!email.endsWith('@mite.ac.in')) {
            messageEl.textContent = "Registration requires an @mite.ac.in email.";
            return;
        }

        try {
            await createUserWithEmailAndPassword(auth, email, password);
            toast('Account created successfully!', 'success');
            navigate('home');
        } catch (error) {
            messageEl.textContent = error.message;
        }
    });
}
  }
});

// 2. Handle Login
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = emailInput.value;
  const password = passwordInput.value;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Check if the student verified their inbox
    if (!user.emailVerified) {
      messageEl.style.color = "red";
      messageEl.textContent = "Please verify your email before logging in.";
      return;
    }

    messageEl.style.color = "green";
    messageEl.textContent = "Login successful! Redirecting...";
    
    // Redirect to dashboard page
    // window.location.href = "dashboard.html";
  } catch (error) {
    messageEl.style.color = "red";
    messageEl.textContent = error.message;
  }
});

/* ---------- 12. NAVIGATION & EVENTS ---------- */

function pageFromHash() {
  const name = location.hash.replace('#', '');
  return PAGES.includes(name) ? name : 'home';
}

// The URL hash is the single source of truth for the current page.
function navigate(name) {
  if (!PAGES.includes(name)) name = 'home';
  if (location.hash === '#' + name) renderPage(name);
  else location.hash = name;
}

function renderPage(name) {
  const previous = state.currentPage;
  state.currentPage = name;
  PAGES.forEach(p => { $('#page-' + p).hidden = p !== name; });
  $$('.nav-links a').forEach(a => a.classList.toggle('active', a.dataset.page === name));
  $('#nav-links').classList.remove('open');
  $('.menu-toggle').setAttribute('aria-expanded', 'false');
  closeModal();

  if (name === 'report') {
    if (previous !== 'report' || state.pendingReport) resetReportView();
    if (state.pendingReport) {
      setReportMode(state.pendingReport.mode);
      if (state.pendingReport.location) $('#f-location').value = state.pendingReport.location;
      state.pendingReport = null;
    }
  }
  if (name === 'matches') renderMatchesPage();
  if (name === 'map' && state.mapTab === 'map') initMap();
  window.scrollTo({ top: 0 });
}

document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (el) {
    const d = el.dataset;
    switch (d.action) {
      case 'nav': e.preventDefault(); navigate(d.page); break;
      case 'toggle-menu': {
        const open = $('#nav-links').classList.toggle('open');
        el.setAttribute('aria-expanded', String(open));
        break;
      }
      case 'report': goToReport(d.mode, d.location); break;
      case 'report-found-hint': closeModal(); goToReport('found'); break;
      case 'report-another': resetReportView(); break;
      case 'set-mode': setReportMode(d.mode); break;
      case 'clear-report-form': resetReportView(); break;
      case 'remove-photo': clearPhoto(); break;
      case 'view': openDetails(d.id); break;
      case 'admin-view': openDetails(d.id, { admin: true }); break;
      case 'claim': openClaimForm(d.id); break;
      case 'match': openMatch(d.lost, d.found); break;
      case 'my-claims': openMyClaims(); break;
      case 'close-modal': closeModal(); break;
      case 'clear-filters': clearFilters(); break;
      case 'browse-location':
        $('#flt-location').value = d.location;
        renderBrowse();
        navigate('browse');
        break;
      case 'return': markReturned(d.id); break;
      case 'approve': decideClaim(d.id, 'Approved'); break;
      case 'reject': decideClaim(d.id, 'Rejected'); break;
      case 'reset-data': resetDemoData(); break;
      case 'select-building': selectBuilding(d.id); break;
      case 'map-tab': setMapTab(d.tab); break;
      case 'rerun-matching': {
        setLoading(el, true);
        setTimeout(() => { setLoading(el, false); renderMatchesPage(); renderStats(); toast('Matching refreshed.', 'info'); }, 700);
        break;
      }
    }
    return;
  }
  if (e.target.id === 'modal') closeModal(); // click on the dark backdrop
});

document.addEventListener('submit', e => {
  e.preventDefault();
  const form = e.target;
  if (form.id === 'report-form') handleReportSubmit(form);
  else if (form.id === 'claim-form') handleClaimSubmit(form);
  else if (form.id === 'my-claims-form') {
    const email = formValues(form).email || '';
    if (!isEmail(email)) { setErrors(form, { email: 'Enter a valid email address.' }); return; }
    openMyClaims(email);
  }
});

// Clear a field's error as soon as the user edits it.
document.addEventListener('input', e => {
  const field = e.target.closest('.field');
  if (!field || !e.target.name) return;
  e.target.classList.remove('invalid');
  const err = $('[data-error-for="' + e.target.name + '"]', field);
  if (err && e.target.type !== 'file') err.textContent = '';
});

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
window.addEventListener('hashchange', () => renderPage(pageFromHash()));

/* ---------- 13. INIT ---------- */

function init() {
  fillSelect($('#f-category'), CATEGORIES.map(c => c.name), null);
  $('#f-category').insertAdjacentHTML('afterbegin', '<option value="">Select a category</option>');
  $('#f-category').value = '';
  fillSelect($('#f-location'), LOCATIONS, null);
  $('#f-location').insertAdjacentHTML('afterbegin', '<option value="">Select a location</option>');
  $('#f-location').value = '';
  fillSelect($('#flt-category'), CATEGORIES.map(c => c.name), 'All categories');
  fillSelect($('#flt-location'), LOCATIONS, 'All locations');
  $('#f-date').max = todayISO();

  $('#flt-search').addEventListener('input', renderBrowse);
  ['#flt-type', '#flt-category', '#flt-location', '#flt-date'].forEach(s => $(s).addEventListener('change', renderBrowse));
  $('#match-min').addEventListener('change', renderMatchesPage);
  $('#dir-search').addEventListener('input', renderDirectory);
  $('#f-photo').addEventListener('change', e => handlePhotoChange(e.target));

  Store.load();
  setReportMode('lost');
  renderAll();
  renderPage(pageFromHash());
}

document.addEventListener('DOMContentLoaded', init);
