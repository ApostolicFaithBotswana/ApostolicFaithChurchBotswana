/* ============================================================
   AFC BOTSWANA — SMOOTH SCROLL & PAGE MOTION (Lenis)
   ────────────────────────────────────────────────────────────
   HOW TO TUNE TRANSITIONS:
     • PAGE_EXIT_MS  — fade-out duration before navigation (default 520)
     • PAGE_ENTER    — controlled in css/site-enhancements.css
     • LENIS_LERP    — lower = smoother scroll (0.08–0.12)
   ============================================================ */

const PAGE_EXIT_MS = 420;

let lenis = null;

export function initSiteMotion() {
  ensurePageVeil();
  initLenis();
  initPageTransitions();
  initScrollReveal();

  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    requestAnimationFrame(() => {
      document.body.classList.add('page-enter');
      document.documentElement.classList.add('page-ready');
      document.body.addEventListener('animationend', (e) => {
        if (e.animationName === 'pageEnter') document.body.classList.remove('page-enter');
      }, { once: true });
    });
  } else {
    document.documentElement.classList.add('page-ready');
  }
}

function ensurePageVeil() {
  if (document.getElementById('pageVeil')) return;
  const veil = document.createElement('div');
  veil.id = 'pageVeil';
  veil.className = 'page-veil';
  veil.setAttribute('aria-hidden', 'true');
  document.body.prepend(veil);
}

function initLenis() {
  if (typeof Lenis === 'undefined') return;

  lenis = new Lenis({
    lerp: 0.09,
    smoothWheel: true,
    wheelMultiplier: 0.85,
    smoothTouch: false,
  });

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  window.__afcLenis = lenis;

  lenis.on('scroll', () => {
    const nav = document.getElementById('navbar');
    if (nav) nav.classList.add('nav-pinned');
  });
}

/**
 * Soft fade between internal .html pages.
 * Skipped for new tabs, external links, anchors, and reduced-motion users.
 */
function initPageTransitions() {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || a.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey) return;

    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto')) return;

    const path = href.split('#')[0];
    if (!path.endsWith('.html') && path !== '/' && !path.endsWith('/')) return;

    if (reducedMotion) return;

    e.preventDefault();
    document.body.classList.add('page-exit');
    document.documentElement.classList.add('page-leaving');
    setTimeout(() => { window.location.href = a.href; }, PAGE_EXIT_MS);
  });
}

function initScrollReveal() {
  const els = document.querySelectorAll(
    '.pillar-card, .resource-card, .event-card, .gallery-tile, .belief-card, .district-card, .region-section, .loc-stat, .structure-card, .timeline-card'
  );
  if (!('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -20px 0px' });

  els.forEach((el, i) => {
    el.classList.add('reveal-on-scroll');
    el.style.setProperty('--reveal-delay', `${Math.min(i * 0.035, 0.28)}s`);
    io.observe(el);
  });
}

/** Use for programmatic navigation (e.g. admin redirect) */
export function softNavigate(url) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) {
    window.location.href = url;
    return;
  }
  document.body.classList.add('page-exit');
  document.documentElement.classList.add('page-leaving');
  setTimeout(() => { window.location.href = url; }, PAGE_EXIT_MS);
}

export function getLenis() {
  return lenis;
}
