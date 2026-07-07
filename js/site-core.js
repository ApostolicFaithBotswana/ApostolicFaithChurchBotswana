/* ============================================================
   AFC BOTSWANA — SHARED SITE BOOTSTRAP
   Import this on every public page (about, locations, etc.)
   alongside page-specific scripts.
   ============================================================ */

import { initSiteMotion } from './site-motion.js';
import { initLiveAdmin } from './live-admin.js';

document.addEventListener('DOMContentLoaded', () => {
  initSiteMotion();
  const page = document.body.dataset.page || 'index';
  initLiveAdmin(page);
});
