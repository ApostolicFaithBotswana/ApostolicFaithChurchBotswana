/* ============================================================
   AFC BOTSWANA — SMOOTH SCROLL & PAGE MOTION (Lenis)
   ────────────────────────────────────────────────────────────
   HOW TO TUNE:
     • LENIS_LERP  — lower = smoother/slower (0.08–0.15)
     • Change page fade in initPageTransitions() duration
     • Add .reveal-on-scroll to any element for scroll animation
   ============================================================ */

let lenis = null;

export function initSiteMotion() {
  initLenis();
  initPageTransitions();
  initScrollReveal();
  document.body.classList.add('page-enter');
}

/** Lenis smooth scrolling — loaded from CDN in HTML */
function initLenis() {
  if (typeof Lenis === 'undefined') return;

  lenis = new Lenis({
    lerp: 0.1,
    smoothWheel: true,
    wheelMultiplier: 0.9,
  });

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  // Keep navbar pinned — sync Lenis with fixed header
  lenis.on('scroll', () => {
    const nav = document.getElementById('navbar');
    if (nav) nav.classList.add('nav-pinned');
  });
}

/**
 * Fade between internal pages on link click.
 * Only affects same-origin .html links (not #anchors).
 */
function initPageTransitions() {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || a.target === '_blank' || e.metaKey || e.ctrlKey) return;

    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto')) return;
    if (!href.endsWith('.html') && !href.endsWith('/')) return;

    e.preventDefault();
    document.body.classList.add('page-exit');
    setTimeout(() => { window.location.href = a.href; }, 280);
  });
}

/** Elements with .reveal-on-scroll fade up when visible */
function initScrollReveal() {
  const els = document.querySelectorAll('.reveal-on-scroll, .section, .pillar-card, .resource-card, .event-card, .gallery-tile, .belief-card');
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
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  els.forEach((el, i) => {
    el.classList.add('reveal-on-scroll');
    el.style.setProperty('--reveal-delay', `${Math.min(i * 0.05, 0.4)}s`);
    io.observe(el);
  });
}

export function getLenis() {
  return lenis;
}
