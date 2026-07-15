/* ============================================================
   Shared live event focus + countdown (calendar + homepage)
   ============================================================ */

export const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/** Default 2026 annual calendar (editable via live admin JSON on calendar page). */
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

export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function startOfDay(str) {
  if (!str) return null;
  const m = String(str).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) {
    const d = new Date(str);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return new Date(+m[1], +m[2] - 1, +m[3], 0, 0, 0, 0);
}

export function endOfDay(str) {
  if (!str) return null;
  const m = String(str).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) {
    const d = new Date(str);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return new Date(+m[1], +m[2] - 1, +m[3], 23, 59, 59, 999);
}

export function fmtDate(str) {
  const d = startOfDay(str);
  if (!d) return '';
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
}

export function fmtDateRange(start, end) {
  if (!start) return '';
  if (!end || start === end) return fmtDate(start);
  return `${fmtDate(start)} – ${fmtDate(end)}`;
}

export function pad2(n) {
  return String(n).padStart(2, '0');
}

export function partsRemaining(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    mins: Math.floor((total % 3600) / 60),
    secs: total % 60,
    total,
  };
}

export function normalizeCalendarEvent(ev) {
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

export function normalizeSiteEvent(ev) {
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

export function eventBounds(ev) {
  return {
    start: startOfDay(ev.start),
    end: endOfDay(ev.end || ev.start),
  };
}

export function classify(ev, now = Date.now()) {
  const { start, end } = eventBounds(ev);
  if (!start || !end) return 'past';
  const t = now instanceof Date ? now.getTime() : now;
  if (t < start.getTime()) return 'upcoming';
  if (t <= end.getTime()) return 'live';
  return 'past';
}

export function unifyEvents(calendarEvents = [], siteEvents = []) {
  return [
    ...calendarEvents.map(normalizeCalendarEvent),
    ...siteEvents.map(normalizeSiteEvent).filter((e) => e.start),
  ];
}

/** One focus event: happening now (ending soonest), else soonest upcoming. */
export function pickFocus(events, now = Date.now()) {
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

export function remainingMs(ev, mode, now = Date.now()) {
  const { start, end } = eventBounds(ev);
  if (mode === 'live') return Math.max(0, end.getTime() - now);
  return Math.max(0, start.getTime() - now);
}

export function countdownUnitsHtml(ms, unitClass = 'spot-unit') {
  const { days, hours, mins, secs } = partsRemaining(ms);
  return `
    <div class="spot-countdown" aria-live="polite">
      <div class="${unitClass}"><div class="spot-unit-val">${days}</div><div class="spot-unit-lbl">Days</div></div>
      <div class="${unitClass}"><div class="spot-unit-val">${pad2(hours)}</div><div class="spot-unit-lbl">Hours</div></div>
      <div class="${unitClass}"><div class="spot-unit-val">${pad2(mins)}</div><div class="spot-unit-lbl">Mins</div></div>
      <div class="${unitClass}"><div class="spot-unit-val">${pad2(secs)}</div><div class="spot-unit-lbl">Secs</div></div>
    </div>`;
}

/**
 * Mount a single live spotlight that auto-cycles happening-now → next countdown.
 * @param {HTMLElement} el
 * @param {{ getEvents: () => any[], refreshIcons?: (root: HTMLElement) => void, calendarHref?: string, emptyHtml?: string }} opts
 */
export function mountRealtimeSpotlight(el, opts = {}) {
  if (!el) return () => {};
  const {
    getEvents = () => [],
    refreshIcons = () => {},
    calendarHref = 'calendar.html',
    emptyHtml = '<p>No upcoming events right now. <a href="calendar.html">View full calendar</a>.</p>',
  } = opts;

  let lastKey = '';
  let timer = null;

  const paint = () => {
    const now = Date.now();
    const focus = pickFocus(getEvents(), now);

    if (!focus) {
      if (lastKey !== 'empty') {
        lastKey = 'empty';
        el.className = `${el.dataset.baseClass || 'event-spotlight'} is-empty`;
        el.innerHTML = emptyHtml;
      }
      return;
    }

    const { event: ev, mode } = focus;
    const ms = remainingMs(ev, mode, now);
    const key = `${ev.id}:${mode}`;
    const statusLabel = mode === 'live' ? 'Happening now' : 'Up next';
    const countLabel = mode === 'live' ? 'Ending in' : 'Starts in';
    const base = el.dataset.baseClass || 'event-spotlight';

    if (key !== lastKey) {
      lastKey = key;
      el.className = `${base}${mode === 'live' ? ' is-live' : ''}`;
      el.innerHTML = `
        <div class="spot-left">
          <div class="spot-status">${mode === 'live' ? '<span class="spot-pulse" aria-hidden="true"></span>' : ''}${statusLabel}</div>
          <h3 class="spot-title">${esc(ev.name)}</h3>
          <div class="spot-meta">
            <span><i data-lucide="calendar"></i> ${esc(fmtDateRange(ev.start, ev.end))}</span>
            ${ev.place ? `<span><i data-lucide="map-pin"></i> ${esc(ev.place)}</span>` : ''}
          </div>
          <a class="spot-link" href="${esc(calendarHref)}">Full calendar →</a>
        </div>
        <div class="spot-right">
          <div class="spot-count-label" data-spot-label>${countLabel}</div>
          <div data-spot-countdown>${countdownUnitsHtml(ms)}</div>
        </div>`;
      refreshIcons(el);
    } else {
      const label = el.querySelector('[data-spot-label]');
      const mount = el.querySelector('[data-spot-countdown]');
      if (label) label.textContent = countLabel;
      if (mount) mount.innerHTML = countdownUnitsHtml(ms);
      el.classList.toggle('is-live', mode === 'live');
    }
  };

  paint();
  timer = setInterval(paint, 1000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) paint();
  });

  return () => {
    if (timer) clearInterval(timer);
  };
}
