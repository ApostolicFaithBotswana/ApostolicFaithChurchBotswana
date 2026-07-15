/* Events page — featured events + calendar spotlight */

import { DB } from './data.js';
import { icon } from './icons.js';
import { initLiveAdmin, isLiveAdmin } from './live-admin.js';
import { initLucideIcons, refreshLucideIcons } from './lucide-icons.js';
import { lockScroll, unlockScroll, trapModalWheel } from './modal-lock.js';
import {
  EVENTS_2026_DEFAULT,
  unifyEvents,
  mountRealtimeSpotlight,
} from './event-countdown.js';

let currentEventForReg = null;
let eventsCache = [];
let calendarEvents = [...EVENTS_2026_DEFAULT];
let stopSpotlight = null;

document.addEventListener('DOMContentLoaded', async () => {
  initLiveAdmin('events');
  initLucideIcons();
  restartSpotlight();
  loadCalendarEventsForSpotlight();
  await renderEvents();

  DB.subscribeEvents((events) => {
    eventsCache = events;
    paintEvents(events);
  });

  window.addEventListener('afc:events-changed', () => renderEvents());
  window.addEventListener('afc:admin-changed', () => paintEvents(eventsCache));
  window.addEventListener('afc:json-block', (e) => {
    if (e.detail?.key === 'calendar.events.data' && Array.isArray(e.detail.data)) {
      calendarEvents = e.detail.data;
      restartSpotlight();
    }
  });

  const regModal = document.getElementById('regModal');
  if (regModal) {
    trapModalWheel(regModal);
    regModal.addEventListener('click', function (ev) {
      if (ev.target === this) closeRegModal();
    });
  }
});

async function loadCalendarEventsForSpotlight() {
  try {
    const blocks = await Promise.race([
      DB.getBlocks('calendar'),
      new Promise((resolve) => setTimeout(() => resolve(null), 4000)),
    ]);
    if (!blocks) return;
    const stored = blocks?.['calendar.events.data']?.data;
    let list = null;
    if (Array.isArray(stored)) list = stored;
    else if (Array.isArray(stored?.events)) list = stored.events;
    else if (typeof stored?.body === 'string') {
      try { list = JSON.parse(stored.body); } catch { /* ignore */ }
    } else if (Array.isArray(stored?.body)) list = stored.body;
    if (list?.length) {
      calendarEvents = list;
      restartSpotlight();
    }
  } catch {
    /* defaults */
  }
}

function restartSpotlight() {
  if (typeof stopSpotlight === 'function') stopSpotlight();
  const el = document.getElementById('eventsSpotlight');
  if (!el) return;
  stopSpotlight = mountRealtimeSpotlight(el, {
    getEvents: () => unifyEvents(calendarEvents, []),
    refreshIcons: refreshLucideIcons,
    calendarHref: 'calendar.html',
  });
}

async function renderEvents() {
  eventsCache = await DB.getEvents();
  paintEvents(eventsCache);
}

function paintEvents(events) {
  const grid = document.getElementById('eventsGrid');
  const noMsg = document.getElementById('noEventsMsg');
  if (!grid) return;

  if (!events.length) {
    grid.innerHTML = '';
    if (noMsg) noMsg.style.display = 'block';
    return;
  }
  if (noMsg) noMsg.style.display = 'none';

  events.sort((a, b) => getEventDate(a) - getEventDate(b));

  grid.innerHTML = events.map((ev) => `
  <div class="event-card ${isLiveAdmin() ? 'live-editable' : ''}"
       data-edit="event.${ev.id}" data-edit-type="event" data-edit-label="${escAttr(ev.name)}"
       ${ev.externalUrl ? '' : `onclick="openRegModal('${ev.id}')"`}>
    ${isLiveAdmin() ? `<button type="button" class="live-edit-btn" title="Edit this event" onclick="event.stopPropagation();window.dispatchEvent(new CustomEvent('afc:edit-event',{detail:'${ev.id}'}))">${icon('edit', { size: 14 })}<span class="live-edit-btn-label">Edit</span></button>` : ''}
    ${ev.poster ? `<img src="${escAttr(ev.poster)}" alt="${escAttr(ev.name)} poster" class="event-card-poster" loading="lazy" onerror="this.style.display='none'" />` : ''}
    <div class="event-card-date">${icon('calendar', { size: 14 })} ${formatDateRange(ev.startDate, ev.endDate)}</div>
    <h3>${escHtml(ev.name)}</h3>
    <div class="event-card-loc">${icon('location', { size: 14 })} ${escHtml(ev.location)}</div>
    <p>${escHtml(ev.description || '')}</p>
    ${ev.externalUrl
      ? `<a href="${escAttr(ev.externalUrl)}" target="_blank" rel="noopener" class="btn-primary btn-on-dark" onclick="event.stopPropagation();">${icon('external', { size: 14 })} Register on Camp Portal</a>`
      : `<button class="btn-primary btn-on-dark" onclick="event.stopPropagation();openRegModal('${ev.id}')">Register / RSVP</button>`
    }
  </div>`).join('');
}

async function openRegModal(eventId) {
  const events = eventsCache.length ? eventsCache : await DB.getEvents();
  const ev = events.find((e) => e.id === eventId);
  if (!ev) return;

  currentEventForReg = ev;
  const info = document.getElementById('modalEventInfo');
  if (info) {
    info.innerHTML = `<strong>${escHtml(ev.name)}</strong><br>${icon('calendar', { size: 14 })} ${formatDateRange(ev.startDate, ev.endDate)}<br>${icon('location', { size: 14 })} ${escHtml(ev.location)}`;
  }
  document.getElementById('regModal').style.display = 'flex';
  lockScroll();
}

function closeRegModal() {
  document.getElementById('regModal').style.display = 'none';
  document.getElementById('regForm')?.reset();
  currentEventForReg = null;
  unlockScroll();
}

async function handleRegistration(e) {
  e.preventDefault();
  if (!currentEventForReg) return;

  await DB.addRegistration({
    event_id: currentEventForReg.id,
    event_name: currentEventForReg.name,
    name: document.getElementById('regName').value.trim(),
    email: document.getElementById('regEmail').value.trim(),
    phone: document.getElementById('regPhone').value.trim(),
    branch: document.getElementById('regBranch').value,
  });
  closeRegModal();
  showToast('Registration confirmed! We look forward to seeing you.', 'success');
}

function getEventDate(ev) {
  return new Date(`${ev.startDate || '9999-12-31'}T00:00:00`);
}

function formatDateRange(startStr, endStr) {
  if (!startStr) return '';
  if (!endStr || endStr === startStr) return formatDate(startStr);
  const start = new Date(startStr + 'T00:00:00');
  const end = new Date(endStr + 'T00:00:00');
  const opts = { day: 'numeric', month: 'long', year: 'numeric' };
  if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
    return `${start.getDate()} – ${end.toLocaleDateString('en-BW', opts)}`;
  }
  return `${start.toLocaleDateString('en-BW', opts)} – ${end.toLocaleDateString('en-BW', opts)}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-BW', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return dateStr; }
}

function escHtml(str = '') {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escAttr(str = '') {
  return escHtml(str).replace(/'/g, '&#39;');
}

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = `toast show ${type}`;
  setTimeout(() => t.classList.remove('show'), 4000);
}

window.openRegModal = openRegModal;
window.closeRegModal = closeRegModal;
window.handleRegistration = handleRegistration;
