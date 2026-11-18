/* ============================================================
   AFC BOTSWANA — SHARED SITE BOOTSTRAP
   Import this on every public page (about, locations, etc.)
   alongside page-specific scripts.
   ============================================================ */

import { initSiteMotion } from './site-motion.js?v=20261118a';
import { initLiveAdmin } from './live-admin.js?v=20261118a';
import { initSiteNav } from './site-nav.js?v=20261118a';
import { initSiteFooter } from './site-footer.js?v=20261118a';
import { initLucideIcons } from './lucide-icons.js?v=20261118a';

document.addEventListener('DOMContentLoaded', () => {
  initSiteNav();
  initSiteFooter();
  initSiteMotion();
  initLucideIcons();
  const page = document.body.dataset.page || 'index';
  initLiveAdmin(page);
});
