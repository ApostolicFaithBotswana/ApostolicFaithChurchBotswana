/* History page — Lenis-synced GSAP / ScrollTrigger motion */

const SECTION_IDS = [
  'gospel-came',
  'mission',
  'governing',
  'camp-meetings',
  'veterans',
  'youth',
  'music',
  'doctrine',
];

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function waitForLenis(ms = 2500) {
  return new Promise((resolve) => {
    const start = performance.now();
    const tick = () => {
      if (window.__afcLenis) {
        resolve(window.__afcLenis);
        return;
      }
      if (performance.now() - start > ms) {
        resolve(null);
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
}

function syncLenis(lenis) {
  if (!lenis || typeof ScrollTrigger === 'undefined') return;
  lenis.on('scroll', ScrollTrigger.update);
  ScrollTrigger.refresh();
}

function initProgress(lenis) {
  const bar = document.getElementById('histProgress');
  if (!bar) return;

  const update = () => {
    const max =
      document.documentElement.scrollHeight - window.innerHeight || 1;
    const y = lenis ? lenis.scroll : window.scrollY || 0;
    bar.style.width = `${Math.min(100, Math.max(0, (y / max) * 100))}%`;
  };

  if (lenis) lenis.on('scroll', update);
  else window.addEventListener('scroll', update, { passive: true });
  update();
}

function initActiveTabs(lenis) {
  const update = () => {
    const navbar = document.getElementById('navbar');
    const y = lenis ? lenis.scroll : window.scrollY;
    if (navbar) navbar.classList.toggle('scrolled', y > 40);

    let cur = SECTION_IDS[0];
    SECTION_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el && el.getBoundingClientRect().top < 160) cur = id;
    });
    document.querySelectorAll('.s-tab').forEach((t) => {
      t.classList.toggle('active', t.getAttribute('href') === `#${cur}`);
    });
  };

  if (lenis) lenis.on('scroll', update);
  else window.addEventListener('scroll', update, { passive: true });
  update();

  document.querySelectorAll('.s-tab, .hero-btns a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (!href?.startsWith('#')) return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      const offset = 130;
      if (lenis) {
        lenis.scrollTo(target, { offset: -offset, duration: 1.2 });
      } else {
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });
}

function initHero(reduced) {
  const hero = document.querySelector('.hist-hero');
  const bg = document.querySelector('.hist-hero-bg');
  const inner = document.querySelector('.hist-hero-inner');
  if (!hero || !inner) return;

  if (reduced) {
    gsap.set([bg, inner], { clearProps: 'all' });
    return;
  }

  const kids = inner.children;
  gsap.set(kids, { opacity: 0, y: 36 });
  gsap.to(kids, {
    opacity: 1,
    y: 0,
    duration: 1.05,
    stagger: 0.1,
    ease: 'power3.out',
    delay: 0.15,
  });

  if (bg) {
    gsap.fromTo(
      bg,
      { scale: 1.12, yPercent: -4 },
      {
        scale: 1,
        yPercent: 10,
        ease: 'none',
        scrollTrigger: {
          trigger: hero,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      }
    );
  }

  gsap.to(inner, {
    y: 60,
    opacity: 0.35,
    ease: 'none',
    scrollTrigger: {
      trigger: hero,
      start: 'top top',
      end: 'bottom top',
      scrub: true,
    },
  });
}

function revealBatch(selector, vars = {}) {
  const els = gsap.utils.toArray(selector);
  if (!els.length) return;

  gsap.set(els, { opacity: 0, y: vars.y ?? 48 });

  ScrollTrigger.batch(els, {
    start: 'top 88%',
    once: true,
    onEnter: (batch) => {
      gsap.to(batch, {
        opacity: 1,
        y: 0,
        duration: vars.duration ?? 0.9,
        stagger: vars.stagger ?? 0.08,
        ease: vars.ease ?? 'power3.out',
        overwrite: true,
      });
    },
  });
}

function initTimelineLine() {
  const tl = document.querySelector('.tl');
  if (!tl) return;

  const line = document.createElement('div');
  line.className = 'tl-fill';
  Object.assign(line.style, {
    position: 'absolute',
    left: '0.7rem',
    top: '0',
    width: '2px',
    height: '0%',
    background: 'linear-gradient(to bottom, #f0d060, #D4AF37)',
    transformOrigin: 'top center',
    zIndex: '1',
    borderRadius: '2px',
  });
  tl.style.position = 'relative';
  tl.appendChild(line);

  gsap.to(line, {
    height: '100%',
    ease: 'none',
    scrollTrigger: {
      trigger: tl,
      start: 'top 75%',
      end: 'bottom 30%',
      scrub: 0.6,
    },
  });
}

function initSectionHeaders() {
  document.querySelectorAll('.s-block').forEach((section) => {
    const parts = section.querySelectorAll('.s-label, .s-title, .s-lead');
    if (!parts.length) return;
    gsap.from(parts, {
      opacity: 0,
      y: 40,
      duration: 0.95,
      stagger: 0.08,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: section,
        start: 'top 78%',
        once: true,
      },
    });
  });
}

function initTiltCards() {
  if (window.matchMedia('(pointer: coarse)').matches) return;

  document.querySelectorAll('.belief-card, .testi-card, .photo-cell').forEach((card) => {
    const max = 7;
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      gsap.to(card, {
        rotateY: x * max,
        rotateX: -y * max,
        y: -4,
        duration: 0.35,
        ease: 'power2.out',
        transformPerspective: 700,
      });
    });
    card.addEventListener('pointerleave', () => {
      gsap.to(card, {
        rotateX: 0,
        rotateY: 0,
        y: 0,
        duration: 0.55,
        ease: 'power3.out',
      });
    });
  });
}

function initGovTable() {
  const rows = gsap.utils.toArray('.gov-table tbody tr');
  if (!rows.length) return;
  gsap.set(rows, { opacity: 0, x: -24 });
  ScrollTrigger.batch(rows, {
    start: 'top 90%',
    once: true,
    onEnter: (batch) => {
      gsap.to(batch, {
        opacity: 1,
        x: 0,
        duration: 0.7,
        stagger: 0.06,
        ease: 'power2.out',
      });
    },
  });
}

async function init() {
  const lenis = await waitForLenis();
  initProgress(lenis);
  initActiveTabs(lenis);

  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);
  syncLenis(lenis);

  const reduced = prefersReducedMotion();
  initHero(reduced);

  if (reduced) {
    gsap.set(
      '.tl-item, .testi-card, .belief-card, .camp-stat, .photo-cell, .pull-quote, .motto-box, .cycle-pill, .gov-table tbody tr',
      { clearProps: 'all', opacity: 1 }
    );
    return;
  }

  initSectionHeaders();
  initTimelineLine();
  revealBatch('.tl-item', { y: 36, stagger: 0.12 });
  revealBatch('.pull-quote, .motto-box', { y: 28, stagger: 0.1 });
  revealBatch('.cycle-pill', { y: 24, stagger: 0.08 });
  revealBatch('.camp-stat', { y: 32, stagger: 0.1 });
  revealBatch('.testi-card', { y: 40, stagger: 0.09 });
  revealBatch('.belief-card', { y: 40, stagger: 0.07 });
  revealBatch('.photo-cell', { y: 36, stagger: 0.08 });
  initGovTable();
  initTiltCards();

  gsap.from('.hist-cta > *', {
    opacity: 0,
    y: 40,
    duration: 0.9,
    stagger: 0.1,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '.hist-cta',
      start: 'top 80%',
      once: true,
    },
  });

  requestAnimationFrame(() => ScrollTrigger.refresh());
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
