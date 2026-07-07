/* Lock page scroll while a modal/popup is open (works with Lenis smooth scroll). */

let lockCount = 0;
let savedScrollY = 0;

export function lockScroll() {
  lockCount += 1;
  if (lockCount > 1) return;

  savedScrollY = window.scrollY || document.documentElement.scrollTop || 0;

  const lenis = window.__afcLenis;
  if (lenis?.stop) lenis.stop();

  document.body.classList.add('modal-open');
  document.body.style.top = `-${savedScrollY}px`;
}

export function unlockScroll() {
  if (lockCount <= 0) return;
  lockCount -= 1;
  if (lockCount > 0) return;

  document.body.classList.remove('modal-open');
  document.body.style.top = '';

  window.scrollTo(0, savedScrollY);

  const lenis = window.__afcLenis;
  if (lenis?.start) lenis.start();
}

/** Call on modal backdrop to stop scroll chaining to the page */
export function trapModalWheel(modalEl) {
  if (!modalEl || modalEl.dataset.wheelTrapped) return;
  modalEl.dataset.wheelTrapped = '1';
  modalEl.addEventListener(
    'wheel',
    (e) => {
      const dialog = modalEl.querySelector('.live-edit-dialog, .modal-box');
      if (!dialog) return;
      const atTop = dialog.scrollTop <= 0;
      const atBottom = dialog.scrollTop + dialog.clientHeight >= dialog.scrollHeight - 1;
      if ((e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom)) {
        e.preventDefault();
      }
      if (e.target === modalEl) e.preventDefault();
    },
    { passive: false }
  );
}
