/* ============================================================
   Shared site footer — keeps public pages in sync
   ============================================================ */

const FOOTER_LINKS = [
  { label: 'Home', href: 'index.html' },
  { label: 'About', href: 'about.html' },
  { label: 'Locations', href: 'locations.html' },
  { label: 'Live', href: 'live.html' },
  { label: 'Events', href: 'events.html' },
  { label: 'Calendar', href: 'calendar.html' },
  { label: 'Contact', href: 'contact.html' },
];

export function initSiteFooter() {
  const nav = document.querySelector('footer .footer-links');
  if (!nav) return;
  nav.innerHTML = FOOTER_LINKS.map(
    (item) => `<a href="${item.href}">${item.label}</a>`
  ).join('');
}
