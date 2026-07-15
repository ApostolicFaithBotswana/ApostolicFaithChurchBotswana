/* Contact page — message + prayer forms */

import { DB } from './data.js';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const cfg = await DB.getConfig();
    setElIfNoEdit('contactEmail', cfg.contact_email);
    setElIfNoEdit('contactPhone', cfg.contact_phone);
  } catch {
    /* keep HTML defaults */
  }
});

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

function setElIfNoEdit(id, val) {
  const el = document.getElementById(id);
  if (el && val && !el.hasAttribute('data-edit')) el.textContent = val;
}

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = `toast show ${type}`;
  setTimeout(() => t.classList.remove('show'), 4000);
}
