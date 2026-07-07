/* ============================================================
   AFC BOTSWANA — MAIN JS (index.html)
   ============================================================ */

import { DB } from './data.js';
import { icon } from './icons.js';
import { initSiteMotion } from './site-motion.js';
import { initLiveAdmin, isLiveAdmin } from './live-admin.js';

let currentEventForReg = null;
let eventsCache = [];

/* ---------- INIT ---------- */
document.addEventListener('DOMContentLoaded', async () => {
  initSiteMotion();
  initLiveAdmin('index');
  initNavScroll();
  initHamburger();
  initSecretAdminTriggers();

  await applyConfig();
  await renderEvents();

  // Real-time: events + config update without page refresh
  DB.subscribeEvents((events) => {
    eventsCache = events;
    paintEvents(events);
  });

  DB.subscribeConfig(async (cfg) => {
    applyConfigFromData(cfg);
  });

  window.addEventListener('afc:events-changed', () => renderEvents());
  window.addEventListener('afc:admin-changed', () => paintEvents(eventsCache));
});

/* ---------- SECRET ADMIN TRIGGERS ---------- */
function initSecretAdminTriggers() {
  let logoClicks = 0;
  let logoTimer = null;
  const logo = document.querySelector('.nav-brand');
  if (logo) {
    logo.addEventListener('click', (e) => {
      if (isLiveAdmin()) return; // admins use the live editor bar instead
      e.preventDefault();
      logoClicks++;
      clearTimeout(logoTimer);
      if (logoClicks >= 5) {
        logoClicks = 0;
        goToAdmin();
        return;
      }
      logoTimer = setTimeout(() => { logoClicks = 0; }, 3000);
    });
  }

  const SECRET_WORD = 'grace2024';
  let typedBuffer = '';
  let keyTimer = null;
  document.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
    typedBuffer += e.key.toLowerCase();
    if (typedBuffer.length > SECRET_WORD.length) {
      typedBuffer = typedBuffer.slice(-SECRET_WORD.length);
    }
    clearTimeout(keyTimer);
    keyTimer = setTimeout(() => { typedBuffer = ''; }, 4000);
    if (typedBuffer === SECRET_WORD) {
      typedBuffer = '';
      goToAdmin();
    }
  });
}

function goToAdmin() {
  document.body.classList.add('page-exit');
  setTimeout(() => { window.location.href = 'admin.html'; }, 280);
}

/* ---------- CONFIG ---------- */
async function applyConfig() {
  const cfg = await DB.getConfig();
  applyConfigFromData(cfg);
}

function applyConfigFromData(cfg) {
  const verseEl = document.getElementById('weeklyVerse');
  if (verseEl && cfg.verse_text) {
    verseEl.textContent = `"${cfg.verse_text}" — ${cfg.verse_reference || ''}`;
  }
  setEl('aboutText', cfg.about_text);
  setEl('contactEmail', cfg.contact_email);
  setEl('contactPhone', cfg.contact_phone);
}

/* ---------- EVENTS ---------- */
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
    ${isLiveAdmin() ? `<button type="button" class="live-edit-btn" title="Edit this event — click to change details" onclick="event.stopPropagation();window.dispatchEvent(new CustomEvent('afc:edit-event',{detail:'${ev.id}'}))">${icon('edit', { size: 14 })}<span class="live-edit-btn-label">Edit</span></button>` : ''}
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

/* ---------- REGISTRATION MODAL ---------- */
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
}

function closeRegModal() {
  document.getElementById('regModal').style.display = 'none';
  document.getElementById('regForm').reset();
  currentEventForReg = null;
}

async function handleRegistration(e) {
  e.preventDefault();
  if (!currentEventForReg) return;

  const reg = {
    event_id: currentEventForReg.id,
    event_name: currentEventForReg.name,
    name: document.getElementById('regName').value.trim(),
    email: document.getElementById('regEmail').value.trim(),
    phone: document.getElementById('regPhone').value.trim(),
    branch: document.getElementById('regBranch').value,
  };

  await DB.addRegistration(reg);
  closeRegModal();
  showToast('Registration confirmed! We look forward to seeing you.', 'success');
}

document.getElementById('regModal')?.addEventListener('click', function (e) {
  if (e.target === this) closeRegModal();
});

function handleContactForm(e) {
  e.preventDefault();
  showToast('Message received! We will get back to you soon.', 'success');
  e.target.reset();
}

/* ---------- NAV SCROLL — navbar stays fixed at top, always blue ---------- */
function initNavScroll() {
  const nav = document.getElementById('navbar');
  if (nav) {
    nav.classList.add('nav-pinned');
  }
}

function initHamburger() {
  const btn = document.getElementById('hamburger');
  const links = document.getElementById('navLinks');
  if (!btn || !links) return;
  btn.addEventListener('click', () => links.classList.toggle('open'));
  links.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => links.classList.remove('open')));
}

function setEl(id, val) {
  const el = document.getElementById(id);
  if (el && val) el.textContent = val;
}

function escHtml(str = '') {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escAttr(str = '') {
  return escHtml(str).replace(/'/g, '&#39;');
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
window.handleContactForm = handleContactForm;
