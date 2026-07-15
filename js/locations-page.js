/* Locations page — filters, search, maps, nearest branch */

import { refreshLucideIcons } from './lucide-icons.js';

const DISTRICTS = [
  { id: 'gaborone', name: 'Greater Gaborone', lat: -24.68379, lng: 25.88294 },
  { id: 'kgalagadi', name: 'Kgalagadi', lat: -24.6018, lng: 24.9116 },
  { id: 'francistown', name: 'Greater Francistown', lat: -21.17071, lng: 27.50435 },
  { id: 'palapye', name: 'Greater Palapye', lat: -22.5558, lng: 27.1333 },
  { id: 'phikwe', name: 'Greater Selebi Phikwe', lat: -21.9893, lng: 27.8335 },
  { id: 'boteti', name: 'Boteti', lat: -21.4220, lng: 25.5874 },
  { id: 'ngami', name: 'Ngami', lat: -19.9833, lng: 23.4167 },
  { id: 'chobe', name: 'Chobe', lat: -17.7975, lng: 25.3253 },
];

export function initLocationsPage() {
  bindFilters();
  bindSearch();
  bindMapToggles();
  markCardMeta();
  window.getUserLocation = getUserLocation;
  window.toggleMap = toggleMap;
  refreshLucideIcons();
}

function markCardMeta() {
  document.querySelectorAll('.district-card').forEach((card) => {
    const name = card.querySelector('.district-name')?.textContent?.trim() || '';
    const branches = [...card.querySelectorAll('.sub-branch-tag')]
      .map((t) => t.textContent.trim())
      .join(' ');
    card.dataset.search = `${name} ${branches}`.toLowerCase();
  });
}

function bindFilters() {
  const bar = document.getElementById('regionFilters');
  if (!bar) return;

  bar.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-region-filter]');
    if (!btn) return;

    bar.querySelectorAll('[data-region-filter]').forEach((b) => b.classList.remove('is-active'));
    btn.classList.add('is-active');

    const filter = btn.dataset.regionFilter;
    document.querySelectorAll('.region-section').forEach((section) => {
      const match = filter === 'all' || section.id === `region-${filter}`;
      section.hidden = !match;
      section.classList.toggle('is-filtered-out', !match);
    });

    applySearch();
  });
}

function bindSearch() {
  const input = document.getElementById('locationSearch');
  if (!input) return;
  input.addEventListener('input', () => applySearch());
}

function applySearch() {
  const q = (document.getElementById('locationSearch')?.value || '').trim().toLowerCase();
  const activeFilter = document.querySelector('[data-region-filter].is-active')?.dataset.regionFilter || 'all';

  document.querySelectorAll('.region-section').forEach((section) => {
    if (section.hidden) return;
    const regionOk = activeFilter === 'all' || section.id === `region-${activeFilter}`;
    if (!regionOk) {
      section.hidden = true;
      return;
    }

    let visibleCards = 0;
    section.querySelectorAll('.district-card').forEach((card) => {
      const hay = card.dataset.search || '';
      const ok = !q || hay.includes(q);
      card.hidden = !ok;
      card.classList.toggle('is-search-hit', Boolean(q && ok));
      if (ok) visibleCards += 1;
    });

    section.hidden = visibleCards === 0;
  });

  const empty = document.getElementById('locationsEmpty');
  if (empty) {
    const anyVisible = [...document.querySelectorAll('.region-section')]
      .filter((s) => !s.hidden)
      .some((s) => [...s.querySelectorAll('.district-card')].some((c) => !c.hidden));
    empty.hidden = anyVisible;
  }
}

function bindMapToggles() {
  document.querySelectorAll('[data-map-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => toggleMap(btn.dataset.mapToggle, btn));
  });
}

function toggleMap(id, btn) {
  const map = document.getElementById(`map-${id}`);
  if (!map) return;
  const willOpen = !map.classList.contains('open');

  document.querySelectorAll('.district-map.open').forEach((m) => {
    if (m !== map) m.classList.remove('open');
  });
  document.querySelectorAll('[data-map-toggle].is-open').forEach((b) => {
    if (b !== btn) {
      b.classList.remove('is-open');
      b.innerHTML = `<i data-lucide="map"></i><span>Map</span>`;
    }
  });

  map.classList.toggle('open', willOpen);
  if (btn) {
    btn.classList.toggle('is-open', willOpen);
    btn.innerHTML = willOpen
      ? `<i data-lucide="chevron-up"></i><span>Hide map</span>`
      : `<i data-lucide="map"></i><span>Map</span>`;
    refreshLucideIcons(btn);
  }
}

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getUserLocation() {
  const bar = document.getElementById('geoBar');
  const status = document.getElementById('geoStatus');
  if (bar) bar.hidden = false;
  if (status) status.textContent = 'Locating you…';

  if (!navigator.geolocation) {
    if (status) status.textContent = 'Geolocation is not supported by your browser.';
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      let nearest = null;
      let minDist = Infinity;

      DISTRICTS.forEach((d) => {
        const dist = haversine(lat, lng, d.lat, d.lng);
        if (dist < minDist) {
          minDist = dist;
          nearest = d;
        }
      });

      if (!nearest) return;

      document.querySelectorAll('.district-card').forEach((c) => c.classList.remove('nearest'));
      document.querySelectorAll('.nearest-badge').forEach((b) => b.remove());

      // Show all regions so nearest card is visible
      document.querySelectorAll('[data-region-filter]').forEach((b) => b.classList.remove('is-active'));
      document.querySelector('[data-region-filter="all"]')?.classList.add('is-active');
      document.querySelectorAll('.region-section').forEach((s) => {
        s.hidden = false;
      });
      document.querySelectorAll('.district-card').forEach((c) => {
        c.hidden = false;
      });

      const card = document.getElementById(`district-${nearest.id}`);
      if (card) {
        card.classList.add('nearest');
        const head = card.querySelector('.district-card-head > div');
        if (head && !head.querySelector('.nearest-badge')) {
          const badge = document.createElement('span');
          badge.className = 'nearest-badge';
          badge.innerHTML = `<i data-lucide="navigation"></i> Nearest to you`;
          head.appendChild(badge);
          refreshLucideIcons(badge);
        }
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      const km =
        minDist < 1
          ? `${Math.round(minDist * 1000)} m`
          : `${minDist.toFixed(1)} km`;
      if (status) {
        status.innerHTML = `Nearest district: <strong>${nearest.name}</strong> — ${km} from your location.`;
      }
    },
    () => {
      if (status) status.textContent = 'Could not access your location. Please check browser permissions.';
    }
  );
}
