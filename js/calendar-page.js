/* ============================================================
   Calendar page — real-time countdown + upcoming schedule
   ============================================================ */

import { DB } from './data.js';
import { refreshLucideIcons } from './lucide-icons.js';
import {
  EVENTS_2026_DEFAULT,
  MONTH_SHORT,
  esc,
  startOfDay,
  fmtDateRange,
  pad2,
  partsRemaining,
  normalizeCalendarEvent,
  eventBounds,
  classify,
  unifyEvents,
  pickFocus,
  remainingMs,
} from './event-countdown.js';

export { EVENTS_2026_DEFAULT };

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
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

let calendarEvents = [...EVENTS_2026_DEFAULT];
let siteEvents = [];
let currentFilter = 'all';
let tickTimer = null;
let lastFocusKey = '';
let lastCardsKey = '';

function formatCompactRemaining(ms) {
  const { days, hours, mins, secs } = partsRemaining(ms);
  if (days > 0) return `${days}d ${pad2(hours)}h ${pad2(mins)}m`;
  if (hours > 0) return `${hours}h ${pad2(mins)}m ${pad2(secs)}s`;
  return `${mins}m ${pad2(secs)}s`;
}

function allUnified() {
  return unifyEvents(calendarEvents, siteEvents);
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
