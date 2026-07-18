/* ============================================================
   AFC BOTSWANA — MAIN JS (index.html)
   ============================================================ */

import { DB } from './data.js';
import { initSiteMotion, softNavigate } from './site-motion.js';
import { initLiveAdmin, isLiveAdmin } from './live-admin.js';
import { initSiteNav } from './site-nav.js';
import { initSiteFooter } from './site-footer.js';
import { initLucideIcons } from './lucide-icons.js';

/* ---------- INIT ---------- */
document.addEventListener('DOMContentLoaded', async () => {
  initSiteNav();
  initSiteFooter();
  initSiteMotion();
  initLucideIcons();
  initLiveAdmin('index');
  initNavScroll();
  initHamburger();
  initSecretAdminTriggers();

  await applyConfig();

  DB.subscribeConfig(async (cfg) => {
    applyConfigFromData(cfg);
  });
});

/* ---------- SECRET ADMIN TRIGGERS ---------- */
function initSecretAdminTriggers() {
  let logoClicks = 0;
  let logoTimer = null;
  const logo = document.querySelector('.nav-brand');
  if (logo) {
    logo.addEventListener('click', (e) => {
      if (isLiveAdmin()) return;
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
  softNavigate('admin.html');
}

/* ---------- CONFIG ---------- */
async function applyConfig() {
  const cfg = await DB.getConfig();
  applyConfigFromData(cfg);
}

function applyConfigFromData(cfg) {
  const verseEl = document.getElementById('weeklyVerse');
  if (verseEl && cfg.verse_text && !verseEl.hasAttribute('data-edit')) {
    verseEl.textContent = `"${cfg.verse_text}" — ${cfg.verse_reference || ''}`;
  }
  setElIfNoEdit('aboutText', cfg.about_text);
}

function initNavScroll() {
  const nav = document.getElementById('navbar');
  if (nav) nav.classList.add('nav-pinned');
}

function initHamburger() {
  const btn = document.getElementById('hamburger');
  const links = document.getElementById('navLinks');
  if (!btn || !links) return;
  btn.addEventListener('click', () => links.classList.toggle('open'));
  links.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => links.classList.remove('open')));
}

function setElIfNoEdit(id, val) {
  const el = document.getElementById(id);
  if (el && val && !el.hasAttribute('data-edit')) el.textContent = val;
}
