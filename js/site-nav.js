/* ============================================================
   Shared site navigation — keeps every public page in sync
   ============================================================ */

const NAV_ITEMS = [
  { id: 'home', label: 'Home', href: 'index.html', indexHref: '#home' },
  { id: 'resources', label: 'Resources', href: 'resources.html' },
  { id: 'calendar', label: 'Calendar', href: 'calendar.html' },
  { id: 'live', label: 'Live', href: 'live.html' },
  { id: 'camp', label: 'Camp', href: 'camp/index.html' },
  { id: 'locations', label: 'Locations', href: 'locations.html' },
  { id: 'contact', label: 'Contact', href: 'contact.html' },
];

function currentPageId() {
  const page = (document.body?.dataset?.page || '').toLowerCase();
  if (page === 'index' || page === 'newsletter' || page === 'home') return 'home';
  if (page && NAV_ITEMS.some((item) => item.id === page)) return page;

  const file = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
  if (!file || file === 'index.html' || file === '') return 'home';
  if (file.includes('location')) return 'locations';
  if (file.includes('live')) return 'live';
  if (file.includes('resource')) return 'resources';
  if (file.includes('calendar') || file.includes('event')) return 'calendar';
  if (file.includes('contact')) return 'contact';
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
