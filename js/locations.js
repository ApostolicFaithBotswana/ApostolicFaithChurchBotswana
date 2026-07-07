/* ============================================================
   AFCO BOTSWANA — LOCATIONS JS
   ============================================================ */

const BRANCHES = [
  { id: 'gaborone',    name: 'Gaborone Central', lat: -24.683914, lng: 25.883191 },
  { id: 'francistown', name: 'Francistown',       lat: -21.203145, lng: 27.528528 },
  { id: 'maun',        name: 'Maun',              lat: -19.9833, lng: 23.4167 },
  { id: 'letlhakane', name: 'Letlhakane', lat: -21.4167, lng: 25.5833 },
];

document.addEventListener('DOMContentLoaded', () => {
  initNavScroll();
  initHamburger();
});

function getUserLocation() {
  const status = document.getElementById('geoStatus');
  if (!navigator.geolocation) {
    status.textContent = 'Geolocation is not supported by your browser.';
    return;
  }
  status.textContent = 'Locating you...';
  navigator.geolocation.getCurrentPosition(
    pos => highlightNearestBranch(pos.coords.latitude, pos.coords.longitude),
    () => { status.textContent = 'Unable to get your location. Please allow location access and try again.'; }
  );
}

function highlightNearestBranch(lat, lng) {
  let nearest = null;
  let minDist = Infinity;

  BRANCHES.forEach(b => {
    const d = haversine(lat, lng, b.lat, b.lng);
    if (d < minDist) { minDist = d; nearest = b; }
  });

  if (!nearest) return;

  // Remove previous highlights
  document.querySelectorAll('.branch-block').forEach(el => {
    el.classList.remove('nearest');
    el.querySelector('.nearest-badge')?.remove();
  });

  const el = document.getElementById('branch-' + nearest.id);
  if (el) {
    el.classList.add('nearest');
    const badge = document.createElement('div');
    badge.className = 'nearest-badge';
    badge.textContent = '📍 Nearest to You';
    el.prepend(badge);
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  const dist = minDist < 1 ? `${Math.round(minDist * 1000)} m` : `${minDist.toFixed(1)} km`;
  document.getElementById('geoStatus').textContent = `Nearest branch: ${nearest.name} (${dist} away)`;
  showToast(`Nearest branch: ${nearest.name} — ${dist} away`, 'success');
}

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
function toRad(d) { return d * Math.PI / 180; }

/* ---- shared utils ---- */
function initNavScroll() {
  window.addEventListener('scroll', () => {
    const nav = document.getElementById('navbar');
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 50);
  }, { passive: true });
}
function initHamburger() {
  const btn = document.getElementById('hamburger');
  const links = document.getElementById('navLinks');
  if (!btn || !links) return;
  btn.addEventListener('click', () => links.classList.toggle('open'));
  links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => links.classList.remove('open')));
}
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = `toast show ${type}`;
  setTimeout(() => t.classList.remove('show'), 5000);
}
