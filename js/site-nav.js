/* ============================================================
   Shared site navigation — keeps every public page in sync
   ============================================================ */

const NAV_ITEMS = [
  { id: 'home', label: 'Home', href: 'index.html', indexHref: '#home' },
  { id: 'about', label: 'About', href: 'about.html' },
  { id: 'locations', label: 'Locations', href: 'locations.html' },
  { id: 'live', label: 'Live', href: 'live.html' },
  { id: 'events', label: 'Events', href: 'index.html#events', indexHref: '#events' },
  { id: 'resources', label: 'Resources', href: 'index.html#resources', indexHref: '#resources' },
  { id: 'calendar', label: 'Calendar', href: 'calendar.html' },
  { id: 'contact', label: 'Contact', href: 'index.html#contact', indexHref: '#contact' },
];

function currentPageId() {
  const page = (document.body?.dataset?.page || '').toLowerCase();
  if (page === 'index' || page === 'newsletter' || page === 'home') return 'home';
  if (page && NAV_ITEMS.some((item) => item.id === page)) return page;

  const file = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
  if (!file || file === 'index.html' || file === '') return 'home';
  if (file.includes('about') || file.includes('history')) return 'about';
  if (file.includes('location')) return 'locations';
  if (file.includes('live')) return 'live';
  if (file.includes('calendar')) return 'calendar';
  if (file.includes('newsletter')) return 'home';
  return '';
}

function hrefFor(item, pageId) {
  if (pageId === 'home' && item.indexHref) return item.indexHref;
  return item.href;
}

export function initSiteNav() {
  const nav = document.getElementById('navLinks') || document.querySelector('nav.nav-links');
  if (!nav) return;

  const pageId = currentPageId();
  nav.innerHTML = NAV_ITEMS.map((item) => {
    const href = hrefFor(item, pageId);
    const active = item.id === pageId ? ' class="active"' : '';
    return `<a href="${href}"${active}>${item.label}</a>`;
  }).join('');

  // Keep existing hamburger behaviour wired to rebuilt links
  nav.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', () => nav.classList.remove('open'));
  });

  const btn = document.getElementById('hamburger');
  if (btn && !btn.dataset.navBound) {
    btn.dataset.navBound = '1';
    btn.addEventListener('click', () => nav.classList.toggle('open'));
  }
}
