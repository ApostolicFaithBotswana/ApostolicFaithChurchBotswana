/* Contact page — tabs, forms, config */

import { DB } from './data.js';

document.addEventListener('DOMContentLoaded', async () => {
  initContactTabs();
  try {
    const cfg = await DB.getConfig();
    setContactField('contactEmail', cfg.contact_email, 'mailto:');
    setContactField('contactPhone', cfg.contact_phone, 'tel:');
  } catch {
    /* keep HTML defaults */
  }
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
        const isMessage = panel.id === 'panel-message';
        const isPrayer = panel.id === 'panel-prayer';
        const show =
          (target === 'message' && isMessage) ||
          (target === 'prayer' && isPrayer);
        panel.classList.toggle('active', show);
        panel.hidden = !show;
      });
    });
  });
}

function setContactField(id, val, hrefPrefix) {
  const el = document.getElementById(id);
  if (!el || !val || el.hasAttribute('data-edit')) return;
  el.textContent = val;
  if (el.tagName === 'A') {
    const clean = hrefPrefix === 'tel:' ? val.replace(/\s/g, '') : val;
    el.href = hrefPrefix + clean;
  }
}

window.handleContactForm = async function (e) {
  e.preventDefault();
  const btn = e.submitter || e.target.querySelector('[type=submit]');
  if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

  try {
    await DB.addRegistration({
      type: 'contact_message',
      name: document.getElementById('cName')?.value.trim() || '',
      email: document.getElementById('cEmail')?.value.trim() || '',
      subject: document.getElementById('cSubject')?.value.trim() || '',
      message: document.getElementById('cMsg')?.value.trim() || '',
      event_name: 'Contact Form',
    });
    showToast('Message sent! We will get back to you soon.', 'success');
    e.target.reset();
  } catch {
    showToast('Send failed — please try again.', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Send Message'; }
  }
};

window.handlePrayerForm = async function (e) {
  e.preventDefault();
  const btn = e.submitter || e.target.querySelector('[type=submit]');
  if (btn) { btn.disabled = true; btn.textContent = 'Submitting…'; }

  try {
    await DB.addPrayerRequest({
      name: document.getElementById('prName')?.value.trim() || 'Anonymous',
      category: document.getElementById('prCategory')?.value || 'General',
      request: document.getElementById('prRequest')?.value.trim() || '',
      anon: document.getElementById('prAnon')?.value === 'yes',
    });
    showToast('Prayer request received. Our ministers will pray for you.', 'success');
    e.target.reset();
  } catch {
    showToast('Submit failed — please try again.', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Submit Prayer Request'; }
  }
};

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = `toast show ${type}`;
  setTimeout(() => t.classList.remove('show'), 4000);
}
