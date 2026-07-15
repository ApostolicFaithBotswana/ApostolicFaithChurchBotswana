/* ============================================================
   Lucide icons — hydrate [data-lucide] across the site
   https://lucide.dev
   ============================================================ */

const LUCIDE_SRC = 'https://cdn.jsdelivr.net/npm/lucide@0.469.0/dist/umd/lucide.min.js';

let loading = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

export async function initLucideIcons() {
  try {
    if (!window.lucide) {
      loading = loading || loadScript(LUCIDE_SRC);
      await loading;
    }
    window.lucide?.createIcons?.({ attrs: { 'stroke-width': 1.85 } });
  } catch (err) {
    console.warn('Lucide icons unavailable:', err);
  }
}

export function refreshLucideIcons(root = document) {
  try {
    window.lucide?.createIcons?.({
      root,
      attrs: { 'stroke-width': 1.85 },
    });
  } catch {
    /* ignore */
  }
}
