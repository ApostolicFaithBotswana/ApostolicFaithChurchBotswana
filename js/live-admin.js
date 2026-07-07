/* ============================================================
   AFC BOTSWANA — LIVE SITE EDITOR
   ────────────────────────────────────────────────────────────
   When a mainsite admin is logged in (Supabase Auth), this module:
     1. Shows a floating admin bar at the top of every public page
     2. Adds an edit button on every [data-edit] element
     3. Opens a modal to change text, images, cards, districts, JSON lists
     4. Saves to Supabase `site_blocks` and syncs in real time

   Block keys: {page}.{section}.{name}  (page = <body data-page="...">)
   ============================================================ */

import {
  auth, onAuthStateChanged, ROLE_EMAILS,
  onSnapshot, collection, query, where,
} from '../camp/camp-firebase.js';
import { DB } from './data.js';
import { icon } from './icons.js';
import { lockScroll, unlockScroll, trapModalWheel } from './modal-lock.js';
import {
  initSectionLists,
  applyListBlocksFromCache,
  getListItemContext,
  getListItems,
  buildListItemForm,
  saveListItemFromForm,
  attachListToolbars,
  deleteListItem,
  setListsUpdateCallback,
} from './section-lists.js';
import { getListConfig } from './section-lists-config.js';

const SITE_BLOCKS = 'site_blocks';
const FIELD_TYPES = new Set(['card', 'district', 'profile', 'timeline', 'panel', 'section', 'event-card', 'fields']);

const FIELD_LABELS = {
  title: 'Title', body: 'Body text', image: 'Image URL', link: 'Link URL',
  date: 'Date label', badge: 'Badge', accent: 'Accent label', pastor: 'Pastor',
  phone: 'Phone', address: 'Address', serviceTime: 'Service times',
  branches: 'Branches (comma-separated)', quote: 'Quote', name: 'Name',
  role: 'Role / title', subtitle: 'Subtitle', label: 'Label', detail: 'Detail',
  eyebrow: 'Eyebrow', verse: 'Verse', reference: 'Reference', url: 'Image URL', alt: 'Alt text',
};

let isAdmin = false;
let currentPage = 'index';
let blocksCache = {};
let blocksUnsub = null;
let eventsUnsub = null;

export function initLiveAdmin(pageId = 'index') {
  currentPage = pageId;
  ensureEditorShell();

  window.addEventListener('afc:edit-event', (e) => openEventEditor(e.detail));
  window.addEventListener('afc:add-list-item', (e) => {
    const { page, listId } = e.detail || {};
    if (page && listId) openNewListItemEditor(page, listId);
  });

  setListsUpdateCallback(() => {
    if (isAdmin) {
      attachEditButtons();
      attachListToolbars(true);
    }
  });

  loadAndApplyBlocks();
  subscribeBlocks();
  initSectionLists(pageId).then(() => {
    if (isAdmin) {
      attachEditButtons();
      attachListToolbars(true);
    }
  });

  onAuthStateChanged(auth, (user) => {
    isAdmin = !!user && user.email?.toLowerCase() === ROLE_EMAILS.mainsite;
    document.body.classList.toggle('is-live-admin', isAdmin);
    updateAdminBar(user);
    if (isAdmin) {
      attachEditButtons();
      attachListToolbars(true);
    } else {
      detachEditButtons();
      attachListToolbars(false);
    }
    window.dispatchEvent(new CustomEvent('afc:admin-changed', { detail: isAdmin }));
  });
}

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
  trapModalWheel(modal);

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

const EDIT_PLACEMENT_CLASSES = [
  'live-editable--float-above',
  'live-editable--card-top',
  'live-editable--chip',
  'live-editable--contact-value',
  'live-editable--media',
  'live-editable--section-header',
  'live-editable--bar-top',
];

function getEditPlacement(el) {
  const type = el.dataset.editType || 'text';
  const tag = el.tagName.toLowerCase();

  if (el.closest('.contact-item')) return 'contact-value';
  if (type === 'list') return 'bar-top';
  if (type === 'image' || el.classList.contains('gallery-tile')) return 'media';
  if (type === 'section' || el.classList.contains('section-heading')) return 'section-header';
  if (el.classList.contains('cycle-item')) return 'chip';
  if (el.classList.contains('motto-banner')) return 'bar-top';
  if (type === 'panel' || el.classList.contains('social-item')) return 'card-top';

  const cardLike = [
    'timeline-card', 'event-card', 'district-card', 'pillar-card',
    'resource-card', 'belief-card', 'structure-card', 'superintendent-section',
  ];
  if (cardLike.some((cls) => el.classList.contains(cls))) return 'card-top';
  if (['card', 'district', 'timeline', 'event-card', 'profile'].includes(type)) return 'card-top';

  if ((type === 'text' || type === 'html') && ['p', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
    return 'float-above';
  }

  return 'card-top';
}

function attachEditButtons() {
  document.querySelectorAll('[data-edit]').forEach((el) => {
    const key = el.dataset.edit;
    if (key?.startsWith('event.')) return;

    const placement = getEditPlacement(el);
    EDIT_PLACEMENT_CLASSES.forEach((cls) => el.classList.remove(cls));
    el.classList.add('live-editable', `live-editable--${placement}`);

    if (el.querySelector(':scope > .live-edit-btn')) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'live-edit-btn';
    btn.title = 'Edit this section';
    btn.setAttribute('aria-label', 'Edit this section');
    btn.innerHTML = `${icon('edit', { size: 14 })}<span class="live-edit-btn-label">Edit</span>`;
    btn.onclick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (key?.startsWith('event.')) openEventEditor(key.replace('event.', ''));
      else openBlockEditor(el);
    };
    el.appendChild(btn);
  });
}

function detachEditButtons() {
  document.querySelectorAll('.live-edit-btn').forEach((b) => b.remove());
  document.querySelectorAll('.live-editable').forEach((el) => {
    el.classList.remove('live-editable', ...EDIT_PLACEMENT_CLASSES);
  });
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
        blocksCache[key] = { id: d.id, data: row.data || {} };
      });
      applyAllBlocks();
      applyListBlocksFromCache(currentPage, blocksCache);
      if (isAdmin) {
        attachEditButtons();
        attachListToolbars(true);
      }
      window.dispatchEvent(new CustomEvent('afc:blocks-changed', { detail: blocksCache }));
    },
    (err) => console.warn('Blocks realtime error:', err)
  );
}

function applyAllBlocks() {
  document.querySelectorAll('[data-edit]').forEach((el) => {
    const key = el.dataset.edit;
    if (key?.startsWith('event.')) return;
    const listParent = el.closest('[data-edit-list]');
    if (listParent?.dataset.editList && el.dataset.listItemId) return;
    const block = blocksCache[key];
    if (!block?.data) return;
    applyBlockToElement(el, block.data);
  });
}

function usesFieldChildren(type) {
  return FIELD_TYPES.has(type);
}

function applyBlockToElement(el, data) {
  const type = el.dataset.editType || 'text';

  if (type === 'image') {
    const img = el.querySelector('img') || el;
    if (img.tagName === 'IMG') {
      if (data.url || data.image) img.src = data.url || data.image;
      if (data.alt) img.alt = data.alt;
    }
    return;
  }

  if (type === 'text') {
    const field = el.dataset.editField || 'body';
    if (data[field] !== undefined) el.textContent = data[field];
    return;
  }

  if (type === 'html') {
    const field = el.dataset.editField || 'body';
    if (data[field] !== undefined) el.innerHTML = data[field];
    return;
  }

  if (type === 'list') {
    const items = String(data.body || '').split('\n').map((s) => s.trim()).filter(Boolean);
    el.innerHTML = items.map((s) => `<span>${escHtml(s)}</span>`).join('\n    ');
    return;
  }

  if (type === 'json') {
    try {
      const parsed = typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
      window.dispatchEvent(new CustomEvent('afc:json-block', {
        detail: { key: el.dataset.edit, data: parsed },
      }));
    } catch (e) {
      console.warn('Invalid JSON block:', e);
    }
    return;
  }

  if (usesFieldChildren(type)) {
    el.querySelectorAll('[data-edit-field]').forEach((child) => {
      const f = child.dataset.editField;
      if (data[f] === undefined) return;
      applyFieldValue(child, f, data[f]);
    });
    if (data.image) {
      const imgEl = el.querySelector('[data-edit-field="image"]');
      if (imgEl?.tagName === 'IMG') imgEl.src = data.image;
    }
    return;
  }

  const field = el.dataset.editField || 'body';
  if (data[field] !== undefined) el.textContent = data[field];
}

function applyFieldValue(child, field, value) {
  if (field === 'branches') {
    const tags = String(value).split(',').map((s) => s.trim()).filter(Boolean);
    child.innerHTML = tags.map((t) => `<span class="sub-branch-tag">${escHtml(t)}</span>`).join('');
    return;
  }
  if (child.tagName === 'IMG') {
    child.src = value;
    return;
  }
  if (child.tagName === 'A') {
    if (field === 'phone') {
      const tel = String(value).replace(/\s/g, '');
      child.href = tel.startsWith('tel:') ? tel : `tel:${tel}`;
      child.textContent = value;
    } else {
      child.href = value;
      if (!child.textContent.trim() || child.classList.contains('resource-link')) {
        child.textContent = child.textContent.trim() || value;
      }
    }
    return;
  }
  if (child.dataset.editFormat === 'html') child.innerHTML = value;
  else child.textContent = value;
}

let editingEl = null;
let editingEventId = null;
let editingMode = null;
let editingListCtx = null;

function imagePreviewHtml(url, label = 'Current image') {
  if (!url || url.startsWith('data:')) return '';
  return `<div class="img-upload-preview"><img src="${esc(url)}" alt=""><span class="img-upload-preview-label">${label}</span></div>`;
}

function uploadImageField(name = 'file', label = 'Upload image') {
  return `<div class="form-group"><label>${label}</label><input type="file" name="${name}" accept="image/*"></div>`;
}

function openBlockEditor(el) {
  const listCtx = getListItemContext(el);
  if (listCtx) {
    openListItemEditor(listCtx);
    return;
  }

  editingMode = 'block';
  editingEl = el;
  editingEventId = null;
  editingListCtx = null;
  const type = el.dataset.editType || 'text';
  const label = el.dataset.editLabel || el.dataset.edit || 'Content';
  document.getElementById('liveEditTitle').textContent = `Edit: ${label}`;
  document.getElementById('liveEditHint').textContent =
    type === 'json'
      ? 'Edit the JSON carefully. Invalid JSON will not save correctly.'
      : 'Changes publish immediately for all visitors. Upload photos from your device.';

  const form = document.getElementById('liveEditForm');
  const key = el.dataset.edit;
  const existing = blocksCache[key]?.data || gatherDataFromElement(el, type);
  form.innerHTML = buildFormFields(type, existing);
  document.getElementById('liveEditModal').classList.add('open');
  lockScroll();
}

function openListItemEditor(ctx, isNew = false) {
  editingMode = isNew ? 'list-item-new' : 'list-item';
  editingListCtx = ctx;
  editingEl = ctx.card || null;
  editingEventId = null;

  const item = isNew ? {} : getListItems(ctx.page, ctx.listId).find((i) => i.id === ctx.itemId) || {};
  document.getElementById('liveEditTitle').textContent = isNew
    ? `Add: ${ctx.config.label}`
    : `Edit: ${ctx.config.label}`;
  document.getElementById('liveEditHint').textContent =
    'Upload images from your device. Changes sync in real time for all visitors.';

  const form = document.getElementById('liveEditForm');
  form.innerHTML = buildListItemForm(ctx.config, item, { isNew })
    + (isNew ? '' : `<button type="button" class="btn-outline-dark" id="liveDeleteListItem" style="margin-top:.5rem;color:#c0392b;border-color:#c0392b;">Remove card</button>`);

  document.getElementById('liveDeleteListItem')?.addEventListener('click', async () => {
    if (!confirm('Remove this card from the section?')) return;
    await deleteListItem(ctx.page, ctx.listId, ctx.itemId);
    closeEditModal();
    attachEditButtons();
    attachListToolbars(true);
    window.dispatchEvent(new CustomEvent('afc:lists-changed'));
  });

  document.getElementById('liveEditModal').classList.add('open');
  lockScroll();
}

function openNewListItemEditor(page, listId) {
  const config = getListConfig(page, listId);
  if (!config) return;
  const container = document.querySelector(config.selector);
  openListItemEditor({
    page,
    listId,
    itemId: null,
    config,
    container,
    card: null,
  }, true);
}

function gatherDataFromElement(el, type) {
  if (type === 'text' || type === 'html') {
    const field = el.dataset.editField || 'body';
    return { [field]: type === 'html' ? el.innerHTML.trim() : el.textContent.trim() };
  }
  if (type === 'image') {
    const img = el.querySelector('img') || el;
    return { url: img.src || '', alt: img.alt || '' };
  }
  if (type === 'list') {
    const items = [...el.querySelectorAll('span')].map((s) => s.textContent.trim()).filter(Boolean);
    return { body: items.join('\n') };
  }
  if (type === 'json') {
    const src = window.__afcJsonSources?.[el.dataset.edit];
    return { body: JSON.stringify(src || [], null, 2) };
  }
  if (usesFieldChildren(type)) {
    const data = {};
    el.querySelectorAll('[data-edit-field]').forEach((child) => {
      const f = child.dataset.editField;
      if (f === 'branches') {
        data[f] = [...child.querySelectorAll('.sub-branch-tag, span')]
          .map((s) => s.textContent.trim()).filter(Boolean).join(', ');
      } else if (child.tagName === 'IMG') {
        data[f] = child.src;
      } else if (child.tagName === 'A' && f === 'phone') {
        data[f] = child.textContent.trim() || child.getAttribute('href')?.replace('tel:', '') || '';
      } else if (child.tagName === 'A') {
        data[f] = child.getAttribute('href') || child.textContent.trim();
      } else if (child.dataset.editFormat === 'html') {
        data[f] = child.innerHTML.trim();
      } else {
        data[f] = child.textContent.trim();
      }
    });
    return data;
  }
  const data = {};
  el.querySelectorAll('[data-edit-field]').forEach((child) => {
    const f = child.dataset.editField;
    data[f] = child.tagName === 'IMG' ? child.src : child.textContent.trim();
  });
  return data;
}

function buildFormFields(type, data) {
  if (type === 'text') {
    const field = editingEl?.dataset.editField || 'body';
    const val = data[field] || '';
    const isLong = val.length > 120;
    return `
      <div class="form-group">
        <label>${FIELD_LABELS[field] || (field === 'title' ? 'Title' : 'Text')}</label>
        ${isLong
          ? `<textarea name="${field}" rows="5">${esc(val)}</textarea>`
          : `<input type="text" name="${field}" value="${esc(val)}">`}
      </div>`;
  }
  if (type === 'html') {
    const field = editingEl?.dataset.editField || 'body';
    return `<div class="form-group"><label>Content (HTML allowed)</label><textarea name="${field}" rows="8">${esc(data[field] || '')}</textarea></div>`;
  }
  if (type === 'image') {
    const current = data.url || data.image || '';
    return `
      ${imagePreviewHtml(current)}
      ${uploadImageField('file', current ? 'Replace image' : 'Upload image')}
      <div class="form-group"><label>Alt text</label><input type="text" name="alt" value="${esc(data.alt || '')}"></div>`;
  }
  if (type === 'list') {
    return `<div class="form-group"><label>Items (one per line)</label><textarea name="body" rows="8">${esc(data.body || '')}</textarea></div>`;
  }
  if (type === 'json') {
    return `<div class="form-group"><label>JSON data</label><textarea name="body" rows="16" style="font-family:monospace;font-size:.8rem;">${esc(data.body || '')}</textarea></div>`;
  }
  if (usesFieldChildren(type)) {
    return buildDynamicFields(data);
  }
  return buildDynamicFields(data);
}

function buildDynamicFields(data) {
  const keys = editingEl
    ? [...editingEl.querySelectorAll('[data-edit-field]')].map((c) => c.dataset.editField)
    : Object.keys(data);
  const uniqueKeys = [...new Set(keys)];
  let html = '';
  let hasImage = false;

  uniqueKeys.forEach((key) => {
    const val = data[key] || '';
    const label = FIELD_LABELS[key] || key;
    if (key === 'image') {
      hasImage = true;
      html += imagePreviewHtml(val, 'Current photo');
    } else if (key === 'body' || key === 'quote' || key === 'address' || String(val).length > 120) {
      html += `<div class="form-group"><label>${label}</label><textarea name="${key}" rows="4">${esc(val)}</textarea></div>`;
    } else {
      html += `<div class="form-group"><label>${label}</label><input type="text" name="${key}" value="${esc(val)}"></div>`;
    }
  });

  if (hasImage || editingEl?.querySelector('[data-edit-field="image"]')) {
    const current = data.image || '';
    html += uploadImageField('file', current ? 'Replace photo' : 'Upload photo');
  }
  return html || `<div class="form-group"><label>Text</label><textarea name="body" rows="4">${esc(data.body || '')}</textarea></div>`;
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
    ${imagePreviewHtml(ev.poster || '', 'Current poster')}
    ${uploadImageField('posterFile', ev.poster ? 'Replace poster' : 'Upload poster')}
    <div class="form-group"><label>External registration URL (optional)</label><input type="url" name="externalUrl" value="${esc(ev.externalUrl || '')}" placeholder="https://..."></div>
    ${eventId ? `<button type="button" class="btn-outline-dark" id="liveDeleteEvent" style="margin-top:.5rem;color:#c0392b;border-color:#c0392b;">Delete event</button>` : ''}`;

  document.getElementById('liveDeleteEvent')?.addEventListener('click', async () => {
    if (!confirm('Delete this event?')) return;
    await DB.deleteEvent(eventId);
    closeEditModal();
    window.dispatchEvent(new CustomEvent('afc:events-changed'));
  });

  document.getElementById('liveEditModal').classList.add('open');
  lockScroll();
}

function closeEditModal() {
  document.getElementById('liveEditModal')?.classList.remove('open');
  editingEl = null;
  editingEventId = null;
  editingMode = null;
  editingListCtx = null;
  unlockScroll();
}

async function saveEditModal() {
  const form = document.getElementById('liveEditForm');
  const fd = new FormData(form);
  try {
    if (editingMode === 'event') await saveEventFromForm(fd);
    else if (editingMode === 'list-item' || editingMode === 'list-item-new') {
      await saveListItemFromForm(editingListCtx, fd, editingListCtx?.itemId);
      attachEditButtons();
      attachListToolbars(true);
      window.dispatchEvent(new CustomEvent('afc:lists-changed'));
    } else if (editingMode === 'block') await saveBlockFromForm(fd);
    closeEditModal();
  } catch (err) {
    alert('Save failed: ' + err.message);
  }
}

async function saveBlockFromForm(fd) {
  const type = editingEl.dataset.editType || 'text';
  const key = editingEl.dataset.edit;
  const existing = blocksCache[key]?.data || {};
  const data = {};

  for (const [k, v] of fd.entries()) {
    if (k !== 'file' && k !== 'posterFile' && v !== '') data[k] = v;
  }

  const file = fd.get('file');
  if (file?.size) {
    const url = await DB.uploadMedia(file);
    data.image = data.url = url;
  } else if (existing.image || existing.url) {
    data.image = existing.image || existing.url;
    data.url = data.image;
  }

  if (type === 'json') {
    JSON.parse(data.body);
  }

  await DB.saveBlock(currentPage, key, type, data);
  blocksCache[key] = { data };
  applyBlockToElement(editingEl, data);
  if (isAdmin) attachEditButtons();
  window.dispatchEvent(new CustomEvent('afc:blocks-changed', { detail: blocksCache }));
}

async function saveEventFromForm(fd) {
  const data = {
    name: fd.get('name')?.trim(),
    startDate: fd.get('startDate'),
    endDate: fd.get('endDate'),
    location: fd.get('location')?.trim(),
    description: fd.get('description')?.trim() || '',
    poster: '',
    externalUrl: fd.get('externalUrl')?.trim() || '',
  };
  if (!data.name || !data.startDate || !data.endDate || !data.location) {
    alert('Please fill in all required fields.');
    return;
  }

  const posterFile = fd.get('posterFile');
  if (posterFile?.size) {
    data.poster = await DB.uploadMedia(posterFile);
  } else if (editingEventId) {
    const events = await DB.getEvents();
    const prev = events.find((e) => e.id === editingEventId);
    if (prev?.poster) data.poster = prev.poster;
  }

  if (editingEventId) await DB.updateEvent(editingEventId, data);
  else await DB.addEvent(data);
  window.dispatchEvent(new CustomEvent('afc:events-changed'));
}

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

function escHtml(s) {
  return esc(s);
}

export function isLiveAdmin() {
  return isAdmin;
}
