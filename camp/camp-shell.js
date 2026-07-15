/* ============================================================
   Camp portal shell — shared footer matching main site
   ============================================================ */

import { campIcon, hydrateCampIcons } from './camp-icons.js';

function footerHtml(base = '.') {
  const root = base === '.' ? '..' : '../..';
  const here = base;
  return `
  <div class="container footer-inner">
    <div class="footer-main">
      <div class="footer-brand">
        <div class="logo-icon logo-icon-sm">
          <img src="${root}/css/images/logo1.png" alt="AFC Botswana" />
        </div>
        <div>
          <p class="footer-church-name">Apostolic Faith Church</p>
          <p class="footer-sub">Camp Meeting 2026 · Botswana</p>
        </div>
      </div>

      <nav class="footer-links" aria-label="Camp footer navigation">
        <a href="${here}/index.html">Camp Home</a>
        <a href="${here}/registration.html">Register</a>
        <a href="${here}/schedule.html">Schedule</a>
        <a href="${here}/store.html">Store</a>
        <a href="${here}/announcements.html">Announcements</a>
        <a href="${root}/index.html">Main Site</a>
      </nav>

      <div class="footer-connect">
        <p class="footer-connect-label">Connect</p>
        <div class="footer-socials">
          <a href="https://facebook.com/people/Apostolic-Faith-Church-of-Portland-Oregon-Botswana/100064412953117" target="_blank" rel="noopener" aria-label="Facebook">${campIcon('facebook', { size: 18 })}</a>
          <a href="https://zoom.us/j/84874457626" target="_blank" rel="noopener" aria-label="Zoom">${campIcon('zoom', { size: 18 })}</a>
          <a href="https://www.youtube.com/@apostolicfaithbotswanahead3540" target="_blank" rel="noopener" aria-label="YouTube">${campIcon('youtube', { size: 18, stroke: false })}</a>
          <a href="mailto:apostolicfaithchurchbotswana@gmail.com" aria-label="Email us">${campIcon('mail', { size: 18 })}</a>
        </div>
      </div>
    </div>
    <div class="footer-bottom">
      <p class="footer-copy">© 2026 Apostolic Faith Church · Botswana. All rights reserved.</p>
      <p class="footer-motto">“The just shall live by faith.” — Romans 1:17</p>
    </div>
  </div>`;
}

/** Replace every .camp-footer with the unified site-style footer. */
export function mountCampFooters() {
  const path = location.pathname.replace(/\\/g, '/');
  const inAdmin = /\/admin\//.test(path);
  const base = inAdmin ? '..' : '.';

  document.querySelectorAll('footer.camp-footer').forEach((el) => {
    el.className = 'footer camp-site-footer';
    el.innerHTML = footerHtml(base);
  });
}

export function mountWhatsAppFloat(number = '26776159933') {
  if (document.getElementById('campWaFloat')) return;
  const a = document.createElement('a');
  a.id = 'campWaFloat';
  a.className = 'camp-wa-float';
  a.href = `https://wa.me/${number}`;
  a.target = '_blank';
  a.rel = 'noopener';
  a.setAttribute('aria-label', 'WhatsApp camp hub');
  a.innerHTML = campIcon('whatsapp', { size: 28, class: 'camp-wa-float-icon' });
  document.body.appendChild(a);
}

export function initCampShell(opts = {}) {
  mountCampFooters();
  hydrateCampIcons();
  if (opts.whatsapp !== false) {
    mountWhatsAppFloat(opts.whatsappNumber || '26776159933');
  }
}
