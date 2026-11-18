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

function isOnIndexPage() {
  const file = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
  return file === '' || file === 'index.html';
}

function hrefFor(item, pageId) {
  if (pageId === 'home' && item.indexHref && isOnIndexPage()) return item.indexHref;
  return item.href;
}

/* A page restored from the back/forward cache (very common on phones)
   can keep the "leaving" state, leaving an invisible veil that blocks taps. */
window.addEventListener('pageshow', () => {
  document.documentElement.classList.remove('page-leaving');
  document.body?.classList.remove('page-exit');
});

let navDelegateBound = false;

export function initSiteNav() {
  const nav = document.getElementById('navLinks') || document.querySelector('nav.nav-links');
  if (!nav) return;

  const pageId = currentPageId();
  nav.innerHTML = NAV_ITEMS.map((item) => {
    const href = hrefFor(item, pageId);
    const active = item.id === pageId ? ' class="active"' : '';
    return `<a href="${href}"${active}>${item.label}</a>`;
  }).join('');

  const btn = document.getElementById('hamburger');

  function setOpen(open) {
    nav.classList.toggle('open', open);
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  // Close the menu when a link is tapped
  nav.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', () => setOpen(false));
  });

  if (navDelegateBound) return;
  navDelegateBound = true;

  /* One single owner of the hamburger.
     Listening on document in the CAPTURE phase means we run before any other
     handler attached to the button (e.g. an old one in main.js), and we stop
     it from firing. That prevents the "opens then instantly closes" bug where
     two handlers both toggle .open. */
  document.addEventListener(
    'click',
    (e) => {
      const target = e.target instanceof Element ? e.target : null;
      if (!target) return;

      if (target.closest('#hamburger')) {
        e.stopImmediatePropagation();
        e.preventDefault();
        setOpen(!nav.classList.contains('open'));
        return;
      }

      // Tap outside the menu closes it
      if (nav.classList.contains('open') && !target.closest('#navLinks')) {
        setOpen(false);
      }
    },
    true
  );

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
  });

  // Reset when resizing back up to desktop width
  window.addEventListener('resize', () => {
    if (window.innerWidth > 1100) setOpen(false);
  });
}