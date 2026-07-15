/* ============================================================
   Calendar page — real-time countdown + upcoming schedule
   ============================================================ */

import { DB } from './data.js';
import { refreshLucideIcons } from './lucide-icons.js';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const TYPE_META = {
  camp: { pill: 'pill-camp', label: 'Camp' },
  revival: { pill: 'pill-revival', label: 'Revival' },
  youth: { pill: 'pill-youth', label: 'Youth' },
  board: { pill: 'pill-board', label: 'Board' },
  special: { pill: 'pill-special', label: 'Special' },
  featured: { pill: 'pill-special', label: 'Featured' },
};

const SCOPE_META = {
  national: { pill: 'pill-national', label: 'National' },
  regional: { pill: 'pill-regional', label: 'Regional' },
  international: { pill: 'pill-international', label: 'International' },
};

/** Default 2026 annual calendar (editable via live admin JSON). */
export const EVENTS_2026_DEFAULT = [
  { id: 1, name: 'National Committees Meeting', start: '2026-01-24', end: '2026-01-24', place: 'Mahalapye', type: 'special', scope: 'national', resp: 'National Committees' },
  { id: 2, name: 'National Youth Retreat', start: '2026-02-20', end: '2026-02-22', place: 'Francistown', type: 'youth', scope: 'national', resp: 'Youths' },
  { id: 3, name: 'Revival', start: '2026-03-06', end: '2026-03-08', place: 'Selebi Phikwe & Molepolole', type: 'revival', scope: 'regional', resp: 'Central + Greater Phikwe' },
  { id: 4, name: 'Lesotho Camp', start: '2026-03-08', end: '2026-03-15', place: 'Maseru, Lesotho', type: 'camp', scope: 'international', resp: 'All' },
  { id: 5, name: 'Campmeeting Prep', start: '2026-03-19', end: '2026-03-19', place: 'Virtual', type: 'special', scope: 'national', resp: 'Committees' },
  { id: 6, name: 'Revival', start: '2026-03-20', end: '2026-03-22', place: 'Jackalas 1', type: 'revival', scope: 'regional', resp: 'North East' },
  { id: 7, name: 'Revival', start: '2026-03-27', end: '2026-04-02', place: 'Letlhakane', type: 'revival', scope: 'regional', resp: 'Boteti/Maun' },
  { id: 8, name: 'SHE Training', start: '2026-03-31', end: '2026-03-31', place: 'Branch/Virtual', type: 'special', scope: 'regional', resp: 'Welfare' },
  { id: 9, name: 'Passover', start: '2026-04-02', end: '2026-04-06', place: 'Regional', type: 'special', scope: 'regional', resp: 'Regions' },
  { id: 10, name: 'Zambia Camp', start: '2026-04-04', end: '2026-04-19', place: 'Lusaka, Zambia', type: 'camp', scope: 'international', resp: 'All' },
  { id: 11, name: 'Revival', start: '2026-05-01', end: '2026-05-03', place: 'Moshupa', type: 'revival', scope: 'regional', resp: 'Southern' },
  { id: 12, name: 'Namibia Camp', start: '2026-05-03', end: '2026-05-10', place: 'Windhoek, Namibia', type: 'camp', scope: 'international', resp: 'All' },
  { id: 13, name: "Mother's Day Celebration", start: '2026-05-08', end: '2026-05-10', place: 'Gaborone', type: 'special', scope: 'regional', resp: 'Mothers' },
  { id: 14, name: 'National Youth Camp', start: '2026-05-14', end: '2026-05-17', place: 'Gaborone', type: 'youth', scope: 'national', resp: 'Youth' },
  { id: 15, name: 'Revival', start: '2026-05-29', end: '2026-05-31', place: 'Tsamaya', type: 'revival', scope: 'regional', resp: 'North East' },
  { id: 16, name: "National Children's Day", start: '2026-06-06', end: '2026-06-06', place: 'Branches', type: 'special', scope: 'national', resp: 'Services' },
  { id: 17, name: 'Campmeeting Preparation', start: '2026-06-13', end: '2026-06-13', place: 'Gaborone', type: 'special', scope: 'national', resp: 'National Committees' },
  { id: 18, name: "Father's Day", start: '2026-06-20', end: '2026-06-20', place: 'Letlhakane', type: 'special', scope: 'regional', resp: 'Men' },
  { id: 19, name: 'International Camp', start: '2026-06-28', end: '2026-07-12', place: 'Portland, USA', type: 'camp', scope: 'international', resp: 'All' },
  { id: 20, name: 'Camp Revival', start: '2026-07-12', end: '2026-07-16', place: 'Gaborone', type: 'camp', scope: 'regional', resp: 'Outreach' },
  { id: 21, name: 'Botswana Camp Meeting', start: '2026-07-19', end: '2026-07-26', place: 'Gaborone', type: 'camp', scope: 'national', resp: 'National Committees' },
  { id: 22, name: 'Revival', start: '2026-08-01', end: '2026-08-01', place: 'Sebina', type: 'revival', scope: 'regional', resp: 'North West' },
  { id: 23, name: 'Malawi Camp', start: '2026-08-02', end: '2026-08-09', place: 'Blantyre, Malawi', type: 'camp', scope: 'international', resp: 'All' },
  { id: 24, name: 'Eswatini / Burundi Camp', start: '2026-08-09', end: '2026-08-16', place: 'Eswatini', type: 'camp', scope: 'international', resp: 'All' },
  { id: 25, name: 'Revival', start: '2026-08-14', end: '2026-08-23', place: 'Nata', type: 'revival', scope: 'regional', resp: 'North West' },
  { id: 26, name: 'Angola Camp', start: '2026-08-16', end: '2026-08-23', place: 'Angola', type: 'camp', scope: 'international', resp: 'All' },
  { id: 27, name: 'Regional Youth Camp', start: '2026-08-23', end: '2026-08-30', place: 'Harare, Zimbabwe', type: 'youth', scope: 'international', resp: 'All' },
  { id: 28, name: 'Revival', start: '2026-08-24', end: '2026-08-30', place: 'Rakops', type: 'revival', scope: 'regional', resp: 'Boteti/Maun' },
  { id: 29, name: 'Revival', start: '2026-08-29', end: '2026-08-29', place: 'Mahalapye', type: 'revival', scope: 'regional', resp: 'Central' },
  { id: 30, name: 'Mozambique Camp', start: '2026-08-30', end: '2026-09-06', place: 'Chimoio, Mozambique', type: 'camp', scope: 'international', resp: 'All' },
  { id: 31, name: 'Revival', start: '2026-09-11', end: '2026-09-13', place: 'Sese/Jwaneng', type: 'revival', scope: 'regional', resp: 'Southern' },
  { id: 32, name: 'SHE Personnel Training', start: '2026-09-01', end: '2026-09-30', place: 'Branches', type: 'special', scope: 'regional', resp: 'Services' },
  { id: 33, name: 'South Africa Camp', start: '2026-09-27', end: '2026-10-04', place: 'Bapsfontein, South Africa', type: 'camp', scope: 'international', resp: 'All' },
  { id: 34, name: 'Revival', start: '2026-10-23', end: '2026-10-25', place: 'Mmopane', type: 'revival', scope: 'regional', resp: 'Southern' },
  { id: 35, name: 'Revival', start: '2026-10-26', end: '2026-11-01', place: 'Mokoboxane', type: 'revival', scope: 'regional', resp: 'North West' },
  { id: 36, name: 'Thanksgiving', start: '2026-11-21', end: '2026-11-21', place: 'National', type: 'special', scope: 'regional', resp: 'Regional/Branch' },
  { id: 37, name: 'SEA Camp', start: '2026-12-06', end: '2026-12-20', place: 'Bulawayo, Zimbabwe', type: 'camp', scope: 'international', resp: 'All' },
];

let calendarEvents = [...EVENTS_2026_DEFAULT];
let siteEvents = [];
let currentFilter = 'all';
let tickTimer = null;
let lastFocusKey = '';
let lastCardsKey = '';

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Parse YYYY-MM-DD as local midnight. */
function startOfDay(str) {
  if (!str) return null;
  const m = String(str).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) {
    const d = new Date(str);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return new Date(+m[1], +m[2] - 1, +m[3], 0, 0, 0, 0);
}

/** End of local calendar day for YYYY-MM-DD. */
function endOfDay(str) {
  if (!str) return null;
  const m = String(str).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) {
    const d = new Date(str);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return new Date(+m[1], +m[2] - 1, +m[3], 23, 59, 59, 999);
}

function fmtDate(str) {
  const d = startOfDay(str);
  if (!d) return '';
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
}

function fmtDateRange(start, end) {
  if (!start) return '';
  if (!end || start === end) return fmtDate(start);
  return `${fmtDate(start)} – ${fmtDate(end)}`;
}

function partsRemaining(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return { days, hours, mins, secs, total };
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function formatCompactRemaining(ms) {
  const { days, hours, mins, secs } = partsRemaining(ms);
  if (days > 0) return `${days}d ${pad2(hours)}h ${pad2(mins)}m`;
  if (hours > 0) return `${hours}h ${pad2(mins)}m ${pad2(secs)}s`;
  return `${mins}m ${pad2(secs)}s`;
}

function normalizeCalendarEvent(ev) {
  return {
    id: `cal-${ev.id}`,
    rawId: ev.id,
    name: ev.name || '',
    start: ev.start,
    end: ev.end || ev.start,
    place: ev.place || '',
    type: ev.type || 'special',
    scope: ev.scope || 'regional',
    resp: ev.resp || '',
    description: '',
    poster: '',
    externalUrl: '',
    source: 'calendar',
  };
}

function normalizeSiteEvent(ev) {
  return {
    id: `site-${ev.id}`,
    rawId: ev.id,
    name: ev.name || '',
    start: ev.startDate || ev.date || '',
    end: ev.endDate || ev.startDate || ev.date || '',
    place: ev.location || '',
    type: 'featured',
    scope: 'national',
    resp: '',
    description: ev.description || '',
    poster: ev.poster || '',
    externalUrl: ev.externalUrl || '',
    source: 'site',
  };
}

function eventBounds(ev) {
  const start = startOfDay(ev.start);
  const end = endOfDay(ev.end || ev.start);
  return { start, end };
}

function classify(ev, now = Date.now()) {
  const { start, end } = eventBounds(ev);
  if (!start || !end) return 'past';
  const t = now instanceof Date ? now.getTime() : now;
  if (t < start.getTime()) return 'upcoming';
  if (t <= end.getTime()) return 'live';
  return 'past';
}

function allUnified() {
  const cal = calendarEvents.map(normalizeCalendarEvent);
  const site = siteEvents.map(normalizeSiteEvent).filter((e) => e.start);
  return [...cal, ...site];
}

/** Prefer live events (ending soonest), else soonest upcoming. */
function pickFocus(events, now = Date.now()) {
  const live = events
    .filter((e) => classify(e, now) === 'live')
    .sort((a, b) => eventBounds(a).end - eventBounds(b).end);
  if (live.length) return { event: live[0], mode: 'live' };
  const upcoming = events
    .filter((e) => classify(e, now) === 'upcoming')
    .sort((a, b) => eventBounds(a).start - eventBounds(b).start);
  if (upcoming.length) return { event: upcoming[0], mode: 'upcoming' };
  return null;
}

function remainingMs(ev, mode, now = Date.now()) {
  const { start, end } = eventBounds(ev);
  if (mode === 'live') return Math.max(0, end.getTime() - now);
  return Math.max(0, start.getTime() - now);
}

function countdownHtml(ms) {
  const { days, hours, mins, secs } = partsRemaining(ms);
  return `
    <div class="cal-countdown" aria-live="polite">
      <div class="cal-unit"><div class="cal-unit-val">${days}</div><div class="cal-unit-lbl">Days</div></div>
      <div class="cal-unit"><div class="cal-unit-val">${pad2(hours)}</div><div class="cal-unit-lbl">Hours</div></div>
      <div class="cal-unit"><div class="cal-unit-val">${pad2(mins)}</div><div class="cal-unit-lbl">Mins</div></div>
      <div class="cal-unit"><div class="cal-unit-val">${pad2(secs)}</div><div class="cal-unit-lbl">Secs</div></div>
    </div>`;
}

function renderSpotlight(now = Date.now()) {
  const el = document.getElementById('calSpotlight');
  if (!el) return;

  const focus = pickFocus(allUnified(), now);
  if (!focus) {
    el.className = 'cal-spotlight is-empty';
    el.innerHTML = `<p>No more events scheduled this year — check back when the next calendar is published.</p>`;
    if (lastFocusKey !== 'empty') {
      lastFocusKey = 'empty';
      renderList(now);
      updateStats(now);
    } else {
      lastFocusKey = 'empty';
    }
    return;
  }

  const { event: ev, mode } = focus;
  const ms = remainingMs(ev, mode, now);
  const focusKey = `${ev.id}:${mode}`;
  const structureChanged = focusKey !== lastFocusKey;
  lastFocusKey = focusKey;

  const statusLabel = mode === 'live' ? 'Happening now' : 'Up next';
  const countLabel = mode === 'live' ? 'Ending in' : 'Starts in';

  if (structureChanged) {
    el.className = `cal-spotlight${mode === 'live' ? ' is-live' : ''}`;
    el.innerHTML = `
      <div class="cal-spot-left">
        <div class="cal-spot-status">${mode === 'live' ? '<span class="cal-pulse" aria-hidden="true"></span>' : ''}${statusLabel}</div>
        <h2 class="cal-spot-title">${esc(ev.name)}</h2>
        <div class="cal-spot-meta">
          <span><i data-lucide="calendar"></i> ${esc(fmtDateRange(ev.start, ev.end))}</span>
          ${ev.place ? `<span><i data-lucide="map-pin"></i> ${esc(ev.place)}</span>` : ''}
          ${ev.source === 'site' ? '<span><i data-lucide="star"></i> Featured</span>' : ''}
        </div>
      </div>
      <div class="cal-spot-right">
        <div class="cal-countdown-label" id="calCountLabel">${countLabel}</div>
        <div id="calCountdownMount">${countdownHtml(ms)}</div>
      </div>`;
    refreshLucideIcons(el);
    renderList(now);
    updateStats(now);
  } else {
    const label = document.getElementById('calCountLabel');
    const mount = document.getElementById('calCountdownMount');
    if (label) label.textContent = countLabel;
    if (mount) mount.innerHTML = countdownHtml(ms);
    el.classList.toggle('is-live', mode === 'live');
  }
}

function upcomingForCards(now = Date.now()) {
  return allUnified()
    .filter((e) => {
      const s = classify(e, now);
      return s === 'live' || s === 'upcoming';
    })
    .sort((a, b) => {
      const ca = classify(a, now);
      const cb = classify(b, now);
      if (ca === 'live' && cb !== 'live') return -1;
      if (cb === 'live' && ca !== 'live') return 1;
      return eventBounds(a).start - eventBounds(b).start;
    });
}

function cardBadge(ev, now) {
  const status = classify(ev, now);
  if (status === 'live') {
    return `<span class="cal-card-badge live"><span class="cal-pulse" aria-hidden="true"></span> Happening now</span>`;
  }
  const ms = remainingMs(ev, 'upcoming', now);
  const days = partsRemaining(ms).days;
  if (days <= 7) return `<span class="cal-card-badge soon">Soon</span>`;
  return `<span class="cal-card-badge later">Upcoming</span>`;
}

function renderUpcomingCards(now = Date.now()) {
  const grid = document.getElementById('calUpcomingGrid');
  if (!grid) return;

  const items = upcomingForCards(now).slice(0, 9);
  const key = items.map((e) => `${e.id}:${classify(e, now)}`).join('|');

  if (key === lastCardsKey) {
    // Only refresh per-card countdown text
    items.forEach((ev) => {
      const card = [...grid.querySelectorAll('[data-event-id]')].find((n) => n.getAttribute('data-event-id') === ev.id);
      const node = card?.querySelector('.cal-card-countdown');
      if (!node) return;
      const mode = classify(ev, now);
      const ms = remainingMs(ev, mode === 'live' ? 'live' : 'upcoming', now);
      node.textContent = mode === 'live'
        ? `Ending in ${formatCompactRemaining(ms)}`
        : `Starts in ${formatCompactRemaining(ms)}`;
    });
    return;
  }
  lastCardsKey = key;

  if (!items.length) {
    grid.innerHTML = `<div class="cal-empty">No upcoming events right now.</div>`;
    return;
  }

  grid.innerHTML = items.map((ev) => {
    const mode = classify(ev, now);
    const ms = remainingMs(ev, mode === 'live' ? 'live' : 'upcoming', now);
    const countText = mode === 'live'
      ? `Ending in ${formatCompactRemaining(ms)}`
      : `Starts in ${formatCompactRemaining(ms)}`;
    return `
      <article class="cal-event-card${mode === 'live' ? ' is-live' : ''}" data-event-id="${esc(ev.id)}">
        ${ev.poster ? `<img class="cal-event-card-poster" src="${esc(ev.poster)}" alt="" loading="lazy" onerror="this.remove()" />` : ''}
        <div class="cal-event-card-body">
          ${cardBadge(ev, now)}
          <h3>${esc(ev.name)}</h3>
          <div class="cal-card-row"><i data-lucide="calendar"></i><span>${esc(fmtDateRange(ev.start, ev.end))}</span></div>
          ${ev.place ? `<div class="cal-card-row"><i data-lucide="map-pin"></i><span>${esc(ev.place)}</span></div>` : ''}
          ${ev.description ? `<p class="cal-card-desc">${esc(ev.description)}</p>` : ''}
          <div class="cal-card-countdown">${countText}</div>
          ${ev.externalUrl ? `<a class="btn-primary" style="margin-top:.5rem;align-self:flex-start" href="${esc(ev.externalUrl)}" target="_blank" rel="noopener">Register</a>` : ''}
        </div>
      </article>`;
  }).join('');

  refreshLucideIcons(grid);
}

function getFilteredCalendar() {
  const q = (document.getElementById('calSearch')?.value || '').toLowerCase().trim();
  return calendarEvents.filter((ev) => {
    let matchFilter = true;
    if (currentFilter !== 'all') {
      matchFilter = ev.type === currentFilter || ev.scope === currentFilter;
    }
    const hay = `${ev.name} ${ev.place} ${ev.type} ${ev.scope} ${ev.resp || ''}`.toLowerCase();
    return matchFilter && (!q || hay.includes(q));
  });
}

function renderList(now = Date.now()) {
  const el = document.getElementById('calListContent');
  if (!el) return;

  const events = getFilteredCalendar();
  if (!events.length) {
    el.innerHTML = '<div class="cal-empty">No events match your search.</div>';
    return;
  }

  const grouped = {};
  events.forEach((ev) => {
    const m = startOfDay(ev.start)?.getMonth() ?? 0;
    if (!grouped[m]) grouped[m] = [];
    grouped[m].push(ev);
  });

  let html = '';
  Object.keys(grouped)
    .map(Number)
    .sort((a, b) => a - b)
    .forEach((m) => {
      const evs = grouped[m];
      html += `
        <div class="cal-month-group">
          <div class="cal-month-title">
            ${MONTHS[m]} 2026
            <span class="cal-month-count">${evs.length}</span>
          </div>`;
      evs.forEach((raw) => {
        const ev = normalizeCalendarEvent(raw);
        const status = classify(ev, now);
        const d = startOfDay(ev.start);
        const tmeta = TYPE_META[ev.type] || TYPE_META.special;
        const smeta = SCOPE_META[ev.scope] || SCOPE_META.regional;
        html += `
          <div class="cal-event-row${status === 'live' ? ' is-live' : ''}${status === 'past' ? ' is-past' : ''}">
            <div class="cal-date-badge">
              <div class="cal-date-day">${DAY_SHORT[d.getDay()]}</div>
              <div class="cal-date-num">${d.getDate()}</div>
              <div class="cal-date-month">${MONTH_SHORT[d.getMonth()]}</div>
            </div>
            <div class="cal-event-info">
              <div class="cal-event-name">${esc(ev.name)}</div>
              <div class="cal-event-meta">
                <span>${esc(ev.place)}</span>
                <span>${esc(fmtDateRange(ev.start, ev.end))}</span>
                ${ev.resp ? `<span>Team: ${esc(ev.resp)}</span>` : ''}
              </div>
            </div>
            <div class="cal-row-pills">
              ${status === 'live' ? '<span class="cal-row-live">Now</span>' : ''}
              <span class="cal-type-pill ${tmeta.pill}">${tmeta.label}</span>
              <span class="cal-scope-pill ${smeta.pill}">${smeta.label}</span>
            </div>
          </div>`;
      });
      html += '</div>';
    });

  el.innerHTML = html;
}

function updateStats(now = Date.now()) {
  const unified = allUnified();
  const set = (id, val) => {
    const n = document.getElementById(id);
    if (n) n.textContent = val;
  };
  set('statTotal', calendarEvents.length);
  set('statNational', calendarEvents.filter((e) => e.scope === 'national').length);
  set('statLive', unified.filter((e) => classify(e, now) === 'live').length);
  set('statUpcoming', unified.filter((e) => classify(e, now) === 'upcoming').length);
}

function tick() {
  const now = Date.now();
  renderSpotlight(now);
  renderUpcomingCards(now);
  // Light refresh of list badges every ~15s via focus key change is enough;
  // full list on filter/search/data change.
}

function refreshStaticViews() {
  lastFocusKey = '';
  lastCardsKey = '';
  const now = Date.now();
  renderList(now);
  updateStats(now);
  tick();
}

function setFilter(type, btn) {
  currentFilter = type;
  document.querySelectorAll('.cal-filter-btn').forEach((b) => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderList();
}

async function loadSiteEvents() {
  try {
    if (typeof DB.subscribeEvents === 'function') {
      DB.subscribeEvents((events) => {
        siteEvents = Array.isArray(events) ? events : [];
        refreshStaticViews();
      });
    } else {
      siteEvents = await DB.getEvents();
      refreshStaticViews();
    }
  } catch (err) {
    console.warn('Could not load homepage events:', err);
    siteEvents = [];
  }
}

export function initCalendarPage() {
  window.__afcJsonSources = window.__afcJsonSources || {};
  window.__afcJsonSources['calendar.events.data'] = calendarEvents;

  window.addEventListener('afc:json-block', (e) => {
    if (e.detail?.key === 'calendar.events.data' && Array.isArray(e.detail.data)) {
      calendarEvents = e.detail.data;
      window.__afcJsonSources['calendar.events.data'] = calendarEvents;
      refreshStaticViews();
    }
  });

  window.setCalFilter = setFilter;

  document.getElementById('calSearch')?.addEventListener('input', () => renderList());

  refreshStaticViews();
  loadSiteEvents();

  if (tickTimer) clearInterval(tickTimer);
  tickTimer = setInterval(tick, 1000);

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) tick();
  });
}
