/* ============================================================
   AFC BOTSWANA — LIVE SITE EDITOR
   ────────────────────────────────────────────────────────────
   When a mainsite admin is logged in (Supabase Auth), this module:
     1. Shows a floating admin bar at the top of every public page
     2. Adds an edit button (top-right) on every [data-edit] element
     3. Opens a modal to change text, images, or full cards
     4. Saves to Supabase `site_blocks` and syncs in real time

   HOW TO MAKE SOMETHING EDITABLE:
     Add to any HTML element:
       data-edit="page.section.key"
       data-edit-type="text|card|image|html"
       data-edit-label="Friendly name shown in modal"

     Example — editable pillar card on index.html:
       <div class="pillar-card" data-edit="index.pillar.mission"
            data-edit-type="card" data-edit-label="Mission card">
         <h3 data-edit-field="title">Our Mission</h3>
         <p data-edit-field="body">To spread the Gospel...</p>
       </div>

     Block keys use format: {page}.{section}.{name}
     Page = value of <body data-page="index">

   HOW TO ADD A NEW PAGE:
     1. Set <body data-page="about"> on the page
     2. Add data-edit attributes to editable sections
     3. Import site-core.js on that page
   ============================================================ */

import {
  auth, onAuthStateChanged, ROLE_EMAILS, supabase,
  onSnapshot, collection, query, where,
} from '../camp/camp-firebase.js';
import { DB } from './data.js';
import { icon } from './icons.js';

const SITE_BLOCKS = 'site_blocks';
let isAdmin = false;
let currentPage = 'index';
let blocksCache = {};
let blocksUnsub = null;
let eventsUnsub = null;

export function initLiveAdmin(pageId = 'index') {
  currentPage = pageId;
  ensureEditorShell();

  window.addEventListener('afc:edit-event', (e) => openEventEditor(e.detail));

  onAuthStateChanged(auth, (user) => {
    isAdmin = !!user && user.email?.toLowerCase() === ROLE_EMAILS.mainsite;
    document.body.classList.toggle('is-live-admin', isAdmin);
    updateAdminBar(user);
    if (isAdmin) {
      attachEditButtons();
      loadAndApplyBlocks();
      subscribeBlocks();
    } else {
      detachEditButtons();
      blocksUnsub?.();
      blocksUnsub = null;
    }
    window.dispatchEvent(new CustomEvent('afc:admin-changed', { detail: isAdmin }));
  });
}

/** Subscribe public pages to event changes (passed from main.js too) */
export function subscribeLiveEvents(onUpdate) {
  eventsUnsub?.();
  eventsUnsub = onSnapshot(
    collection(null, 'site_events'),
    () => onUpdate?.(),
    (err) => console.warn('Events realtime error:', err)
  );
  return () => eventsUnsub?.();
}

function ensureEditorShell() {
  if (document.getElementById('liveAdminBar')) return;

  const bar = document.createElement('div');
  bar.id = 'liveAdminBar';
  bar.className = 'live-admin-bar';
  bar.innerHTML = `
    <div class="live-admin-bar-inner">
      <span class="live-admin-badge">${icon('edit', { size: 14 })} Live Editor</span>
      <span class="live-admin-email" id="liveAdminEmail"></span>
      <div class="live-admin-actions">
        <a href="admin.html" class="live-admin-btn live-admin-btn-ghost">Dashboard</a>
        <button type="button" class="live-admin-btn" id="liveAdminAddEvent" title="Add a new upcoming event">+ Add Event</button>
        <button type="button" class="live-admin-btn live-admin-btn-ghost" id="liveAdminLogout">Logout</button>
      </div>
    </div>`;
  document.body.prepend(bar);

  const modal = document.createElement('div');
  modal.id = 'liveEditModal';
  modal.className = 'live-edit-modal';
  modal.innerHTML = `
    <div class="live-edit-dialog">
      <button type="button" class="live-edit-close" id="liveEditClose" aria-label="Close">${icon('cross', { size: 18 })}</button>
      <h3 id="liveEditTitle">Edit content</h3>
      <p class="live-edit-hint" id="liveEditHint">Changes save instantly and appear for all visitors.</p>
      <form id="liveEditForm"></form>
      <div class="live-edit-actions">
        <button type="button" class="btn-primary" id="liveEditSave">Save changes</button>
        <button type="button" class="btn-outline-dark" id="liveEditCancel">Cancel</button>
      </div>
    </div>`;
  document.body.appendChild(modal);

  document.getElementById('liveEditClose').onclick = closeEditModal;
  document.getElementById('liveEditCancel').onclick = closeEditModal;
  document.getElementById('liveEditSave').onclick = saveEditModal;
  document.getElementById('liveAdminLogout').onclick = async () => {
    const { signOut } = await import('../camp/camp-firebase.js');
    await signOut();
    window.location.reload();
  };
  document.getElementById('liveAdminAddEvent')?.addEventListener('click', () => openEventEditor(null));
  modal.addEventListener('click', (e) => { if (e.target === modal) closeEditModal(); });
}

function updateAdminBar(user) {
  const bar = document.getElementById('liveAdminBar');
  const email = document.getElementById('liveAdminEmail');
  if (!bar) return;
  bar.classList.toggle('visible', isAdmin);
  if (email) email.textContent = user?.email || '';
  document.body.classList.toggle('has-live-admin-bar', isAdmin);
}

function attachEditButtons() {
  document.querySelectorAll('[data-edit]').forEach((el) => {
    const key = el.dataset.edit;
    if (key?.startsWith('event.')) return;
    if (el.querySelector('.live-edit-btn')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'live-edit-btn';
    btn.title = 'Edit this section — click to change text or image';
    btn.setAttribute('aria-label', 'Edit this section');
    btn.innerHTML = `${icon('edit', { size: 14 })}<span class="live-edit-btn-label">Edit</span>`;
    btn.onclick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      const key = el.dataset.edit;
      if (key?.startsWith('event.')) openEventEditor(key.replace('event.', ''));
      else openBlockEditor(el);
    };
    el.classList.add('live-editable');
    el.appendChild(btn);
  });
}

function detachEditButtons() {
  document.querySelectorAll('.live-edit-btn').forEach((b) => b.remove());
  document.querySelectorAll('.live-editable').forEach((el) => el.classList.remove('live-editable'));
}

async function loadAndApplyBlocks() {
  blocksCache = await DB.getBlocks(currentPage);
  applyAllBlocks();
}

function subscribeBlocks() {
  blocksUnsub?.();
  blocksUnsub = onSnapshot(
    query(collection(null, SITE_BLOCKS), where('page', '==', currentPage)),
    (snap) => {
      blocksCache = {};
    snap.docs.forEach((d) => {
      const row = d.data();
      const key = row.block_key || row.blockKey;
      blocksCache[key] = { id: d.id, data: row.data || row };
    });
      applyAllBlocks();
    },
    (err) => console.warn('Blocks realtime error:', err)
  );
}

function applyAllBlocks() {
  document.querySelectorAll('[data-edit]').forEach((el) => {
    const key = el.dataset.edit;
    if (key?.startsWith('event.')) return;
    const block = blocksCache[key];
    if (!block?.data) return;
    applyBlockToElement(el, block.data);
  });
}

function applyBlockToElement(el, data) {
  const type = el.dataset.editType || 'text';
  if (type === 'image') {
    const img = el.querySelector('img') || el;
    if (img.tagName === 'IMG' && data.url) {
      img.src = data.url;
      if (data.alt) img.alt = data.alt;
    }
    return;
  }
  if (type === 'text' || type === 'html') {
    const field = el.dataset.editField || 'body';
    if (data[field] !== undefined) {
      if (type === 'html') el.innerHTML = data[field];
      else el.textContent = data[field];
    }
    return;
  }
  // card — update child fields
  el.querySelectorAll('[data-edit-field]').forEach((child) => {
    const f = child.dataset.editField;
    if (data[f] !== undefined) {
      if (child.tagName === 'IMG') child.src = data[f];
      else if (child.tagName === 'A') {
        child.href = data[f];
        if (!child.textContent.trim()) child.textContent = data[f];
      } else child.textContent = data[f];
    }
  });
  if (data.image && el.querySelector('[data-edit-field="image"]')) {
    el.querySelector('[data-edit-field="image"]').src = data.image;
  }
}

let editingEl = null;
let editingEventId = null;
let editingMode = null; // 'block' | 'event'

function openBlockEditor(el) {
  editingMode = 'block';
  editingEl = el;
  editingEventId = null;
  const type = el.dataset.editType || 'text';
  const label = el.dataset.editLabel || el.dataset.edit || 'Content';
  document.getElementById('liveEditTitle').textContent = `Edit: ${label}`;
  document.getElementById('liveEditHint').textContent =
    'Tip: Changes publish immediately for all visitors. Use a full image URL or upload a photo below.';

  const form = document.getElementById('liveEditForm');
  const key = el.dataset.edit;
  const existing = blocksCache[key]?.data || gatherDataFromElement(el, type);

  form.innerHTML = buildFormFields(type, existing);
  document.getElementById('liveEditModal').classList.add('open');
}

function gatherDataFromElement(el, type) {
  if (type === 'text' || type === 'html') {
    const field = el.dataset.editField || 'body';
    return { [field]: type === 'html' ? el.innerHTML : el.textContent.trim() };
  }
  if (type === 'image') {
    const img = el.querySelector('img') || el;
    return { url: img.src || '', alt: img.alt || '' };
  }
  const data = {};
  el.querySelectorAll('[data-edit-field]').forEach((child) => {
    const f = child.dataset.editField;
    data[f] = child.tagName === 'IMG' ? child.src : child.textContent.trim();
  });
  const linkEl = el.querySelector('a[data-edit-field="link"], a.resource-link');
  if (linkEl) data.link = linkEl.getAttribute('href') || '';
  return data;
}

function buildFormFields(type, data) {
  if (type === 'text') {
    const field = editingEl?.dataset.editField || 'body';
    const isLong = (data[field] || '').length > 120;
    return `
      <div class="form-group">
        <label>${field === 'title' ? 'Title' : 'Text'}</label>
        ${isLong
          ? `<textarea name="${field}" rows="5">${esc(data[field] || '')}</textarea>`
          : `<input type="text" name="${field}" value="${esc(data[field] || '')}">`}
      </div>`;
  }
  if (type === 'html') {
    const field = editingEl?.dataset.editField || 'body';
    return `<div class="form-group"><label>Content (HTML allowed)</label><textarea name="${field}" rows="8">${esc(data[field] || '')}</textarea></div>`;
  }
  if (type === 'image') {
    return `
      <div class="form-group"><label>Image URL</label><input type="url" name="url" value="${esc(data.url || '')}" placeholder="https://..."></div>
      <div class="form-group"><label>Or upload image</label><input type="file" name="file" accept="image/*"></div>
      <div class="form-group"><label>Alt text</label><input type="text" name="alt" value="${esc(data.alt || '')}"></div>`;
  }
  // card
  return `
    <div class="form-group"><label>Title</label><input type="text" name="title" value="${esc(data.title || '')}"></div>
    <div class="form-group"><label>Body text</label><textarea name="body" rows="4">${esc(data.body || '')}</textarea></div>
    <div class="form-group"><label>Image URL (optional)</label><input type="url" name="image" value="${esc(data.image || '')}"></div>
    <div class="form-group"><label>Or upload image</label><input type="file" name="file" accept="image/*"></div>
    <div class="form-group"><label>Link URL (optional)</label><input type="url" name="link" value="${esc(data.link || '')}"></div>`;
}

async function openEventEditor(eventId) {
  editingMode = 'event';
  editingEl = null;
  editingEventId = eventId;
  document.getElementById('liveEditTitle').textContent = eventId ? 'Edit Event' : 'Add New Event';
  document.getElementById('liveEditHint').textContent = 'Events appear on the homepage in real time for all visitors.';

  let ev = {};
  if (eventId) {
    const events = await DB.getEvents();
    ev = events.find((e) => e.id === eventId) || {};
  }

  document.getElementById('liveEditForm').innerHTML = `
    <div class="form-group"><label>Event name *</label><input type="text" name="name" value="${esc(ev.name || '')}" required></div>
    <div class="form-group"><label>Start date *</label><input type="date" name="startDate" value="${esc(ev.startDate || '')}" required></div>
    <div class="form-group"><label>End date *</label><input type="date" name="endDate" value="${esc(ev.endDate || '')}" required></div>
    <div class="form-group"><label>Location *</label><input type="text" name="location" value="${esc(ev.location || '')}" required></div>
    <div class="form-group"><label>Description</label><textarea name="description" rows="3">${esc(ev.description || '')}</textarea></div>
    <div class="form-group"><label>Poster image URL</label><input type="url" name="poster" value="${esc(ev.poster || '')}"></div>
    <div class="form-group"><label>Or upload poster</label><input type="file" name="posterFile" accept="image/*"></div>
    <div class="form-group"><label>External registration URL (optional)</label><input type="url" name="externalUrl" value="${esc(ev.externalUrl || '')}" placeholder="https://..."></div>
    ${eventId ? `<button type="button" class="btn-outline-dark" id="liveDeleteEvent" style="margin-top:.5rem;color:#c0392b;border-color:#c0392b;">Delete event</button>` : ''}`;

  document.getElementById('liveDeleteEvent')?.addEventListener('click', async () => {
    if (!confirm('Delete this event?')) return;
    await DB.deleteEvent(eventId);
    closeEditModal();
    window.dispatchEvent(new CustomEvent('afc:events-changed'));
  });

  document.getElementById('liveEditModal').classList.add('open');
}

function closeEditModal() {
  document.getElementById('liveEditModal')?.classList.remove('open');
  editingEl = null;
  editingEventId = null;
  editingMode = null;
}

async function saveEditModal() {
  const form = document.getElementById('liveEditForm');
  const fd = new FormData(form);

  try {
    if (editingMode === 'event') await saveEventFromForm(fd);
    else if (editingMode === 'block') await saveBlockFromForm(fd);
    closeEditModal();
  } catch (err) {
    alert('Save failed: ' + err.message);
  }
}

async function saveBlockFromForm(fd) {
  const type = editingEl.dataset.editType || 'text';
  const key = editingEl.dataset.edit;
  const data = {};

  for (const [k, v] of fd.entries()) {
    if (k !== 'file' && v) data[k] = v;
  }

  const file = fd.get('file');
  if (file?.size) data.image = data.url = await DB.uploadMedia(file);

  await DB.saveBlock(currentPage, key, type, data);
  blocksCache[key] = { data };
  applyBlockToElement(editingEl, data);
}

async function saveEventFromForm(fd) {
  const data = {
    name: fd.get('name')?.trim(),
    startDate: fd.get('startDate'),
    endDate: fd.get('endDate'),
    location: fd.get('location')?.trim(),
    description: fd.get('description')?.trim() || '',
    poster: fd.get('poster')?.trim() || '',
    externalUrl: fd.get('externalUrl')?.trim() || '',
  };
  if (!data.name || !data.startDate || !data.endDate || !data.location) {
    alert('Please fill in all required fields.');
    return;
  }

  const posterFile = fd.get('posterFile');
  if (posterFile?.size) data.poster = await DB.uploadMedia(posterFile);

  if (editingEventId) await DB.updateEvent(editingEventId, data);
  else await DB.addEvent(data);

  window.dispatchEvent(new CustomEvent('afc:events-changed'));
}

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

export function isLiveAdmin() {
  return isAdmin;
}
