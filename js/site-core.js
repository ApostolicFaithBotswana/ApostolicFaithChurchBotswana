/* ============================================================
   AFC BOTSWANA — SHARED SITE BOOTSTRAP
   Import this on every public page (about, locations, etc.)
   alongside page-specific scripts.
   ============================================================ */

import { initSiteMotion } from './site-motion.js';
import { initLiveAdmin } from './live-admin.js';
import { initSiteNav } from './site-nav.js';
import { initSiteFooter } from './site-footer.js';
import { initLucideIcons } from './lucide-icons.js';

document.addEventListener('DOMContentLoaded', () => {
  initSiteNav();
  initSiteFooter();
  initSiteMotion();
  initLucideIcons();
  const page = document.body.dataset.page || 'index';
  initLiveAdmin(page);
});
