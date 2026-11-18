/* Contact page — tabs and forms (forms open the visitor's email app, no backend) */

const CHURCH_EMAIL = 'contact@apostolicfaith.org.bw';

document.addEventListener('DOMContentLoaded', () => {
  initContactTabs();
});

function initContactTabs() {
  const tabs = document.querySelectorAll('.contact-tab');
  const panels = document.querySelectorAll('.contact-tab-panel');

  if (!tabs.length) return;

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;

      tabs.forEach((t) => {
        const active = t.dataset.tab === target;
        t.classList.toggle('active', active);
        t.setAttribute('aria-selected', active ? 'true' : 'false');
      });

      panels.forEach((panel) => {
        const show =
          (target === 'message' && panel.id === 'panel-message') ||
          (target === 'prayer' && panel.id === 'panel-prayer');

        panel.classList.toggle('active', show);
        panel.hidden = !show;
      });
    });
  });
}

/**
 * Open the visitor's email app with a pre-filled message
 * addressed to the church.
 */
function openMailto(subject, body) {
  const url =
    `mailto:${CHURCH_EMAIL}` +
    `?subject=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(body)}`;

  window.location.href = url;
}

/** CONTACT US FORM */
window.handleContactForm = function (e) {
  e.preventDefault();

  const form = e.currentTarget;

  const name = document.getElementById('cName')?.value.trim() || '';
  const email = document.getElementById('cEmail')?.value.trim() || '';
  const subject = document.getElementById('cSubject')?.value.trim() || '';
  const message = document.getElementById('cMsg')?.value.trim() || '';

  const body =
    `Name: ${name}\r\n` +
    `Email: ${email}\r\n\r\n` +
    `${message}`;

  openMailto(subject || 'General enquiry', body);

  showToast('Opening your email app — please press Send to deliver your message.', 'success');
  form.reset();
};

/** PRAYER REQUEST FORM */
window.handlePrayerForm = function (e) {
  e.preventDefault();

  const form = e.currentTarget;

  const name = document.getElementById('prName')?.value.trim() || '';
  const category = document.getElementById('prCategory')?.value || 'General';
  const request = document.getElementById('prRequest')?.value.trim() || '';
  const anon = document.getElementById('prAnon')?.value === 'yes';

  const displayName = anon || !name ? 'Anonymous' : name;

  const body =
    `Name: ${displayName}\r\n` +
    `Category: ${category}\r\n` +
    `Anonymous: ${anon ? 'Yes' : 'No'}\r\n\r\n` +
    `Prayer Request:\r\n${request}`;

  openMailto(`Prayer Request: ${category}`, body);

  showToast('Opening your email app — please press Send to submit your prayer request.', 'success');
  form.reset();
};

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');

  if (!t) return;

  t.textContent = msg;
  t.className = `toast show ${type}`;

  setTimeout(() => t.classList.remove('show'), 5000);
}