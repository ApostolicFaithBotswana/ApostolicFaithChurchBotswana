/* ============================================================
   AFCO BOTSWANA — MAIN JS (index.html)
   ============================================================ */

import { DB } from './data.js';

let currentEventForReg = null;

/* ---------- INIT ---------- */
document.addEventListener('DOMContentLoaded', async () => {
  initNavScroll();
  initHamburger();
  updateHeroEventPanel();
  initSecretAdminTriggers();
  await applyConfig();
  await renderEvents();
});

async function renderGallery() {
  // Gallery uses static placeholder tiles in HTML
}

/* ---------- SECRET ADMIN TRIGGERS ---------- */
function initSecretAdminTriggers() {

  // TRIGGER 1: Click the logo 5 times within 3 seconds
  let logoClicks = 0;
  let logoTimer = null;
  const logo = document.querySelector('.nav-brand');
  if (logo) {
    logo.addEventListener('click', (e) => {
      e.preventDefault();
      logoClicks++;
      clearTimeout(logoTimer);
      if (logoClicks >= 5) {
        logoClicks = 0;
        goToAdmin();
        return;
      }
      // Reset count if 3 seconds pass without reaching 5
      logoTimer = setTimeout(() => { logoClicks = 0; }, 3000);
    });
  }

  // TRIGGER 2: Type the secret keyword anywhere on the page
  const SECRET_WORD = 'grace2024';  // ← Change this to your preferred secret word
  let typedBuffer = '';
  let keyTimer = null;
  document.addEventListener('keydown', (e) => {
    // Ignore if user is typing in an input/textarea
    if (['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) return;
    typedBuffer += e.key.toLowerCase();
    // Only keep last N characters matching the secret word length
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
  // Brief subtle flash so you know it worked, then redirect
  document.body.style.transition = 'opacity 0.3s';
  document.body.style.opacity = '0';
  setTimeout(() => { window.location.href = 'admin.html'; }, 300);
}

/* ---------- CONFIG ---------- */
async function applyConfig() {
  const cfg = await DB.getConfig();
  setEl('heroTitle', cfg.hero_title);
  setEl('aboutText', cfg.about_text);
  setEl('contactEmail', cfg.contact_email);
  setEl('contactPhone', cfg.contact_phone);
}

/* ---------- EVENTS ---------- */
async function renderEvents() {
  const events = await DB.getEvents();
  const grid = document.getElementById('eventsGrid');
  const noMsg = document.getElementById('noEventsMsg');
  if (!grid) return;

  if (!events.length) {
    grid.innerHTML = '';
    noMsg.style.display = 'block';
    return;
  }
  noMsg.style.display = 'none';

  // Sort by start date ascending
  events.sort((a, b) => getEventDate(a) - getEventDate(b));

  grid.innerHTML = events.map(ev => `
  <div class="event-card" ${ev.externalUrl ? '' : `onclick="openRegModal('${ev.id}')"`}>
    ${ev.poster ? `<img src="${escAttr(ev.poster)}" alt="${escAttr(ev.name)} poster" class="event-card-poster" loading="lazy" onerror="this.style.display='none'" />` : ''}
    <div class="event-card-date">📅 ${formatDateRange(ev.startDate, ev.endDate)}</div>
    <h3>${escHtml(ev.name)}</h3>
    <div class="event-card-loc">📍 ${escHtml(ev.location)}</div>
    <p>${escHtml(ev.description || '')}</p>
    ${ev.externalUrl
      ? `<a href="${escAttr(ev.externalUrl)}" target="_blank" rel="noopener" class="btn-primary" onclick="event.stopPropagation();">Register on Camp Portal ↗</a>`
      : `<button class="btn-primary" onclick="event.stopPropagation();openRegModal('${ev.id}')">Register / RSVP</button>`
    }
  </div>
`).join('');
}

function updateHeroEventPanel() {
  // Social panel content is static HTML — nothing to update
}

function updateHeroEventPanel() {
  // Social panel content is static HTML — nothing to update
}

/* ---------- REGISTRATION MODAL ---------- */
async function openRegModal(eventId) {
  const events = await DB.getEvents();
  const ev = events.find(e => e.id === eventId);
  if (!ev) return;

  currentEventForReg = ev;
  const info = document.getElementById('modalEventInfo');
  if (info) {
    info.innerHTML = `<strong>${escHtml(ev.name)}</strong><br>📅 ${formatDateRange(ev.startDate, ev.endDate)}<br>📍 ${escHtml(ev.location)}`;
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
  showToast('✓ Registration confirmed! We look forward to seeing you.', 'success');
}

/* Close modal on overlay click */
document.getElementById('regModal')?.addEventListener('click', function(e) {
  if (e.target === this) closeRegModal();
});

/* ---------- CONTACT FORM ---------- */
function handleContactForm(e) {
  e.preventDefault();
  showToast('✓ Message received! We will get back to you soon.', 'success');
  e.target.reset();
}



function getPlaceholderTiles(n) {
  const icons = ['📸','🙏','🎵','🤝','✝️','🌟'];
  const labels = ['Worship Service','Prayer Meeting','Choir Practice','Community Outreach','Convention','Youth Ministry'];
  let html = '';
  for (let i = 0; i < n; i++) {
    html += `<div class="gallery-tile gallery-tile-placeholder" style="--delay:${0.1*i}s"><div class="gallery-placeholder-inner"><span>${icons[i]}</span><p>${labels[i]}</p></div></div>`;
  }
  return html;
}

/* ---------- NAV SCROLL ---------- */
function initNavScroll() {
  window.addEventListener('scroll', () => {
    const nav = document.getElementById('navbar');
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 50);
  }, { passive: true });
}

/* ---------- HAMBURGER ---------- */
function initHamburger() {
  const btn = document.getElementById('hamburger');
  const links = document.getElementById('navLinks');
  if (!btn || !links) return;
  btn.addEventListener('click', () => links.classList.toggle('open'));
  links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => links.classList.remove('open')));
}

/* ---------- UTILS ---------- */
function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function escHtml(str = '') {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
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
  const end   = new Date(endStr + 'T00:00:00');
  const opts  = { day: 'numeric', month: 'long', year: 'numeric' };

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

function formatTime(timeStr) {
  if (!timeStr) return '';
  try {
    const [h, m] = timeStr.split(':');
    const d = new Date();
    d.setHours(+h, +m);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch { return timeStr; }
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
