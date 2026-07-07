/* ============================================================
   AFC BOTSWANA — ADMIN JS (main site)
   Login: Supabase Auth (email + password)
   ============================================================ */

import { DB } from './data.js';
import {
  auth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  ROLE_EMAILS
} from '../camp/camp-firebase.js';

/* ══════════════════════════════════════════════════════════
   AUTH
══════════════════════════════════════════════════════════ */

onAuthStateChanged(auth, async (user) => {
  if (user && user.email.toLowerCase() === ROLE_EMAILS.mainsite) {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminApp').style.display    = 'flex';
    document.getElementById('adminEmailDisplay').textContent = user.email;
    await initAdminApp();
  } else if (user) {
    await signOut(auth);
    showLoginMsg('This account does not have access to the main site admin.', 'error');
  }
});

window.doLogin = async function() {
  const btn   = document.getElementById('loginBtn');
  const email = document.getElementById('loginEmail').value.trim();
  const pwd   = document.getElementById('loginPassword').value;
  clearLoginMsg();

  if (!email || !pwd) {
    showLoginMsg('Please enter your email address and password.', 'error');
    return;
  }

  btn.disabled    = true;
  btn.textContent = 'Logging in…';

  try {
    const cred = await signInWithEmailAndPassword(auth, email, pwd);
    if (cred.user.email.toLowerCase() !== ROLE_EMAILS.mainsite) {
      await signOut(auth);
      showLoginMsg('This account does not have access to the main site admin.', 'error');
      btn.disabled    = false;
      btn.textContent = 'Login →';
      return;
    }
    // onAuthStateChanged handles the rest
  } catch(err) {
    const msgs = {
      'auth/user-not-found':         'No account found with this email address.',
      'auth/wrong-password':         'Incorrect password. Please try again.',
      'auth/invalid-email':          'Please enter a valid email address.',
      'auth/invalid-credential':     'Incorrect email or password.',
      'auth/too-many-requests':      'Too many failed attempts. Please wait a few minutes.',
      'auth/network-request-failed': 'Network error — please check your connection.',
    };
    showLoginMsg(msgs[err.code] || 'Login failed. Please check your credentials.', 'error');
  }

  btn.disabled    = false;
  btn.textContent = 'Login →';
};

window.doLogout = async function() {
  try {
    await signOut(auth);
    window.location.reload();
  } catch(e) {
    window.location.reload();
  }
};

window.doForgotPassword = async function() {
  const email = document.getElementById('loginEmail').value.trim();
  clearLoginMsg();

  if (!email) {
    showLoginMsg('Please enter your email address above, then click "Forgot password?"', 'error');
    return;
  }

  const btn = document.getElementById('forgotBtn');
  btn.textContent = 'Sending…';
  btn.disabled    = true;

  try {
    await sendPasswordResetEmail(auth, email);
    showLoginMsg(`Password reset email sent to ${email} — check your inbox.`, 'success');
  } catch(err) {
    const msgs = {
      'auth/user-not-found':    'No account found with this email address.',
      'auth/invalid-email':     'Please enter a valid email address.',
      'auth/too-many-requests': 'Too many requests. Please wait before trying again.',
    };
    showLoginMsg(msgs[err.code] || 'Could not send reset email. Please try again.', 'error');
  }

  btn.textContent = 'Forgot password?';
  btn.disabled    = false;
};

function showLoginMsg(msg, type) {
  const el = document.getElementById('loginMsg');
  el.textContent   = msg;
  el.className     = `login-msg ${type}`;
  el.style.display = 'block';
}

function clearLoginMsg() {
  document.getElementById('loginMsg').style.display = 'none';
}

/* ══════════════════════════════════════════════════════════
   APP INIT
══════════════════════════════════════════════════════════ */

async function initAdminApp() {
  setupSidebarNav();
  // Load dashboard and content immediately; others load on demand
  await Promise.all([
    loadDashboard(),
    loadContent(),
  ]);
}

function updateClock() {
  const el = document.getElementById('adminDateTime');
  if (el) el.textContent = new Date().toLocaleString('en-BW', {
    weekday: 'long', year: 'numeric', month: 'long',
    day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}
updateClock();
setInterval(updateClock, 60000);

/* ── SIDEBAR NAV ── */
function setupSidebarNav() {
  document.querySelectorAll('.sidebar-link[data-tab]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      switchTab(link.dataset.tab);
    });
  });
}

async function switchTab(tabName) {
  document.querySelectorAll('.admin-tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.sidebar-link[data-tab]').forEach(l => l.classList.remove('active'));

  const tab  = document.getElementById('tab-' + tabName);
  const link = document.querySelector(`.sidebar-link[data-tab="${tabName}"]`);
  if (tab)  tab.classList.add('active');
  if (link) link.classList.add('active');

  const titles = {
    dashboard: 'Dashboard', events: 'Events',
    content: 'Site Content', registrations: 'Registrations', gallery: 'Gallery'
  };
  setEl('adminPageTitle', titles[tabName] || tabName);

  // Load data only when tab is opened (avoids unnecessary reads)
  if (tabName === 'dashboard')     await loadDashboard();
  if (tabName === 'events')        await loadEvents();
  if (tabName === 'content')       await loadContent();
  if (tabName === 'registrations') await loadRegistrations();
  // Gallery tab is static — no data to load
}

/* ══════════════════════════════════════════════════════════
   DASHBOARD
══════════════════════════════════════════════════════════ */

async function loadDashboard() {
  const events = await DB.getEvents();
  const regs   = await DB.getRegistrations();
  setEl('statEvents', events.length);
  setEl('statRegistrations', regs.length);

  const recent = document.getElementById('dashRecentEvents');
  if (!recent) return;

  if (!events.length) {
    recent.innerHTML = '<p style="color:#aab0c0;font-size:.88rem;">No events yet.</p>';
    return;
  }
  recent.innerHTML = events
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 3)
    .map(ev => `
      <div class="admin-event-item">
        <div class="admin-event-item-title">${escHtml(ev.name)}</div>
        <div class="admin-event-item-meta">📅 ${formatDate(ev.date)} · 📍 ${escHtml(ev.location)}</div>
      </div>`).join('');
}

/* ══════════════════════════════════════════════════════════
   EVENTS
══════════════════════════════════════════════════════════ */

async function loadEvents() {
  await renderAdminEventsList();
}

async function renderAdminEventsList() {
  const events = await DB.getEvents();
  const list   = document.getElementById('adminEventsList');
  if (!list) return;

  if (!events.length) {
    list.innerHTML = '<p class="empty-state">No events yet. Add your first event above.</p>';
    return;
  }
  list.innerHTML = events
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(ev => `
      <div class="admin-event-item">
        <div class="admin-event-item-title">${escHtml(ev.name)}</div>
        <div class="admin-event-item-meta">
          📅 ${formatDate(ev.date)} at ${formatTime(ev.time)}<br>
          📍 ${escHtml(ev.location)}
        </div>
        <div class="admin-event-item-actions">
          <button class="btn-edit"   onclick="editEvent('${ev.id}')">✏ Edit</button>
          <button class="btn-delete" onclick="deleteEvent('${ev.id}')">✕ Delete</button>
        </div>
      </div>`).join('');
}

window.saveEvent = async function() {
  const id   = document.getElementById('editingEventId').value;
  const data = {
    name:         document.getElementById('evtName').value.trim(),
    startDate:    document.getElementById('evtStartDate').value,
    endDate:      document.getElementById('evtEndDate').value,
    location:     document.getElementById('evtLocation').value.trim(),
    description:  document.getElementById('evtDesc').value.trim(),
    poster:       document.getElementById('evtPoster').value.trim(),
    externalUrl:  document.getElementById('evtExternalUrl').value.trim(),
  };

  if (!data.name || !data.startDate || !data.endDate || !data.location) {
    showToast('Please fill in all required fields.', 'error'); return;
  }
  if (data.endDate < data.startDate) {
    showToast('End date cannot be before start date.', 'error'); return;
  }

  try {
    if (id) {
      await DB.updateEvent(id, data);
      showToast('Event updated.', 'success');
    } else {
      await DB.addEvent(data);
      showToast('Event added!', 'success');
    }
    clearEventForm();
    await renderAdminEventsList();
    await loadDashboard();
  } catch(e) {
    showToast('Save failed: ' + e.message, 'error');
  }
};

window.editEvent = async function(id) {
  const ev = (await DB.getEvents()).find(e => e.id === id);
  if (!ev) return;
  document.getElementById('editingEventId').value = ev.id;
  document.getElementById('evtName').value         = ev.name        || '';
  document.getElementById('evtStartDate').value    = ev.startDate   || '';
  document.getElementById('evtEndDate').value      = ev.endDate     || '';
  document.getElementById('evtLocation').value     = ev.location    || '';
  document.getElementById('evtDesc').value         = ev.description || '';
  document.getElementById('evtPoster').value       = ev.poster      || '';
  document.getElementById('evtExternalUrl').value  = ev.externalUrl || '';
  setEl('eventFormTitle', 'Edit Event');
};

window.clearEventForm = function() {
  document.getElementById('editingEventId').value = '';
  ['evtName','evtStartDate','evtEndDate','evtLocation','evtDesc','evtPoster','evtExternalUrl']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  setEl('eventFormTitle', 'Add New Event');
};

window.deleteEvent = async function(id) {
  if (!confirm('Delete this event? This cannot be undone.')) return;
  try {
    await DB.deleteEvent(id);
    showToast('Event deleted.', 'success');
    await renderAdminEventsList();
    await loadDashboard();
  } catch(e) {
    showToast('Delete failed: ' + e.message, 'error');
  }
};

window.migrateLegacyEvents = async function() {
  try {
    const count = await DB.migrateLegacyEvents();
    await renderAdminEventsList();
    await loadDashboard();
    showToast(
      count
        ? `Imported ${count} old event${count === 1 ? '' : 's'}.`
        : 'No old browser events found.',
      'success'
    );
  } catch(e) {
    showToast('Import failed: ' + e.message, 'error');
  }
};

/* ══════════════════════════════════════════════════════════
   SITE CONTENT
   ─────────────────────────────────────────────────────────
   FIX: loadContent reads TWO separate verse fields
        (cfgVerseText + cfgVerseRef) instead of one blob.
        saveContent writes BOTH:
          1. site_config/hero_verse → { text, reference }
             (what index.html reads for the homepage hero)
          2. site_config/main       → everything else
══════════════════════════════════════════════════════════ */

async function loadContent() {
  try {
    const cfg = await DB.getConfig();

    // General fields
    setInput('cfgHeroTitle', cfg.hero_title    || '');
    setInput('cfgAboutText', cfg.about_text    || '');
    setInput('cfgEmail',     cfg.contact_email || '');
    setInput('cfgPhone',     cfg.contact_phone || '');

    setInput('cfgVerseText', cfg.verse_text      || '');
    setInput('cfgVerseRef',  cfg.verse_reference || '');
  } catch(e) {
    console.error('loadContent error:', e);
    showToast('Could not load content: ' + e.message, 'error');
  }
}

window.saveContent = async function() {
  const heroTitle   = document.getElementById('cfgHeroTitle').value.trim();
  const verseText   = document.getElementById('cfgVerseText').value.trim();
  const verseRef    = document.getElementById('cfgVerseRef').value.trim();
  const aboutText   = document.getElementById('cfgAboutText').value.trim();
  const email       = document.getElementById('cfgEmail').value.trim();
  const phone       = document.getElementById('cfgPhone').value.trim();

  try {
    await DB.saveHeroVerse(verseText, verseRef);

    await DB.saveConfig({
      hero_title:    heroTitle,
      about_text:    aboutText,
      contact_email: email,
      contact_phone: phone,
      // Also store verse here so DB.getConfig() can return it next time
      verse_text:      verseText,
      verse_reference: verseRef,
    });

    showToast('Content saved. Homepage verse updated.', 'success');
  } catch(e) {
    console.error('saveContent error:', e);
    showToast('Save failed: ' + e.message, 'error');
  }
};

/* ══════════════════════════════════════════════════════════
   REGISTRATIONS
══════════════════════════════════════════════════════════ */

async function loadRegistrations() {
  const regs      = await DB.getRegistrations();
  const container = document.getElementById('registrationsTable');
  if (!container) return;

  if (!regs.length) {
    container.innerHTML = '<p class="empty-state">No registrations yet.</p>';
    return;
  }

  container.innerHTML = `
    <div style="overflow-x:auto;">
      <table class="reg-table">
        <thead>
          <tr>
            <th>Name</th><th>Email</th><th>Phone</th>
            <th>Branch</th><th>Event</th><th>Date</th>
          </tr>
        </thead>
        <tbody>
          ${regs.map(r => `
            <tr>
              <td>${escHtml(r.name)}</td>
              <td>${escHtml(r.email)}</td>
              <td>${escHtml(r.phone)}</td>
              <td>${escHtml(r.branch || '—')}</td>
              <td>${escHtml(r.event_name || '—')}</td>
              <td>${r.created ? new Date(r.created).toLocaleDateString('en-BW') : '—'}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

window.exportRegistrations = async function() {
  const regs = await DB.getRegistrations();
  if (!regs.length) { showToast('No registrations to export.', 'error'); return; }

  const header = ['Name','Email','Phone','Branch','Event','Date'];
  const rows   = regs.map(r => [
    r.name, r.email, r.phone, r.branch || '',
    r.event_name || '',
    r.created ? new Date(r.created).toLocaleDateString('en-BW') : ''
  ]);
  const csv = [header, ...rows]
    .map(row => row.map(v => `"${String(v).replace(/"/g,'""')}"`).join(','))
    .join('\n');

  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = `afc_registrations_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  showToast('Registrations exported as CSV.', 'success');
};

/* ══════════════════════════════════════════════════════════
   GALLERY
   FIX: gallery tab is now static/informational (no DOM
   elements to populate). loadGallery() removed from initAdminApp.
   renderGalleryAdmin / addGalleryPhoto / removeGalleryPhoto
   removed — no matching HTML elements exist.
══════════════════════════════════════════════════════════ */

// Nothing to load — gallery tab is informational only.
// To make it dynamic later, add galleryUrl/galleryCaption
// inputs and a galleryAdminList div to admin.html first.

/* ══════════════════════════════════════════════════════════
   UTILS
══════════════════════════════════════════════════════════ */

function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function setInput(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

function escHtml(str = '') {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-BW', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  } catch { return dateStr; }
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  try {
    const [h, m] = timeStr.split(':');
    const d = new Date(); d.setHours(+h, +m);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch { return timeStr; }
}
function formatDateRange(startStr, endStr) {
  if (!startStr) return '';
  if (!endStr || endStr === startStr) return formatDate(startStr);

  const start = new Date(startStr + 'T00:00:00');
  const end   = new Date(endStr + 'T00:00:00');
  const opts  = { day: 'numeric', month: 'long', year: 'numeric' };

  if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
    // same month: "19 – 26 July 2026"
    return `${start.getDate()} – ${end.toLocaleDateString('en-BW', opts)}`;
  }
  // different months/years: full range
  return `${start.toLocaleDateString('en-BW', opts)} – ${end.toLocaleDateString('en-BW', opts)}`;
}

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className   = `toast show ${type}`;
  setTimeout(() => t.classList.remove('show'), 4000);
}

/* ── expose to HTML onclick attributes ── */
window.switchTab           = switchTab;
window.saveContent         = saveContent;
window.saveEvent           = window.saveEvent;
window.editEvent           = window.editEvent;
window.clearEventForm      = window.clearEventForm;
window.deleteEvent         = window.deleteEvent;
window.migrateLegacyEvents = window.migrateLegacyEvents;
window.exportRegistrations = window.exportRegistrations;