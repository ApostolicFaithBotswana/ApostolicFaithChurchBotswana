/* Admin dashboard — manage repeatable section cards */

import { DB } from './data.js';
import { icon } from './icons.js';
import { SECTION_LISTS, listBlockKey, FIELD_LABELS } from './section-lists-config.js';
import {
  buildListItemForm,
  addListItem,
  updateListItem,
  deleteListItem,
} from './section-lists.js';
import { lockScroll, unlockScroll } from './modal-lock.js';

let sectionsUnsub = null;
let editingSection = null;

export function initSectionsAdmin() {
  renderSectionsTab();
  sectionsUnsub?.();
  sectionsUnsub = DB.subscribeAllBlocks(() => {
    renderSectionsTab();
  });
}

export function destroySectionsAdmin() {
  sectionsUnsub?.();
  sectionsUnsub = null;
}

async function renderSectionsTab() {
  const root = document.getElementById('sectionsAdminRoot');
  if (!root) return;

  const byPage = {};
  Object.values(SECTION_LISTS).forEach((config) => {
    if (!byPage[config.page]) byPage[config.page] = [];
    byPage[config.page].push(config);
  });

  let html = '<p class="sections-intro">Add, edit, or remove cards in each section. Changes appear on the live site in real time.</p>';

  for (const [page, configs] of Object.entries(byPage)) {
    const blocks = await DB.getBlocks(page);
    html += `<div class="sections-page-group"><h3 class="sections-page-title">${pageLabel(page)}</h3>`;

    for (const config of configs) {
      const key = listBlockKey(config.id);
      const items = blocks[key]?.data?.items || [];
      html += `
        <div class="sections-panel" data-section-page="${config.page}" data-section-id="${config.id}">
          <div class="sections-panel-head">
            <div>
              <strong>${esc(config.label)}</strong>
              <span class="sections-count">${items.length} card${items.length === 1 ? '' : 's'}</span>
            </div>
            <button type="button" class="admin-btn-secondary sections-add-btn" data-add-section="${config.page}:${config.id}">
              ${icon('edit', { size: 13 })} Add card
            </button>
          </div>
          <div class="sections-items">${renderItemsList(config, items)}</div>
        </div>`;
    }
    html += '</div>';
  }

  root.innerHTML = html;

  root.querySelectorAll('[data-add-section]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const [page, id] = btn.dataset.addSection.split(':');
      openSectionModal(page, id, null);
    });
  });

  root.querySelectorAll('[data-edit-section-item]').forEach((btn) => {
    btn.addEventListener('click', () => {
      openSectionModal(btn.dataset.page, btn.dataset.listId, btn.dataset.itemId);
    });
  });

  root.querySelectorAll('[data-delete-section-item]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Remove this card?')) return;
      await deleteListItem(btn.dataset.page, btn.dataset.listId, btn.dataset.itemId);
      renderSectionsTab();
    });
  });
}

function renderItemsList(config, items) {
  if (!items.length) return '<p class="empty-state">No cards yet. Click Add card to create one.</p>';
  return items.map((item) => {
    const title = item.title || item.label || item.badge || item.alt || item.id;
    const thumb = item.image
      ? `<img src="${escAttr(item.image)}" alt="" class="sections-item-thumb">`
      : '';
    return `<div class="sections-item">
      ${thumb}
      <div class="sections-item-body">
        <div class="sections-item-title">${esc(title)}</div>
        <div class="sections-item-meta">${fieldSummary(config, item)}</div>
      </div>
      <div class="sections-item-actions">
        <button type="button" class="btn-edit" data-edit-section-item data-page="${config.page}" data-list-id="${config.id}" data-item-id="${escAttr(item.id)}">${icon('edit', { size: 13 })} Edit</button>
        <button type="button" class="btn-delete" data-delete-section-item data-page="${config.page}" data-list-id="${config.id}" data-item-id="${escAttr(item.id)}">${icon('trash', { size: 13 })}</button>
      </div>
    </div>`;
  }).join('');
}

function fieldSummary(config, item) {
  return config.fields
    .filter((f) => f !== 'image' && f !== 'body' && item[f])
    .slice(0, 2)
    .map((f) => `${FIELD_LABELS[f] || f}: ${String(item[f]).slice(0, 40)}`)
    .join(' · ') || 'Card content';
}

function openSectionModal(page, listId, itemId) {
  const config = SECTION_LISTS[`${page}:${listId}`];
  if (!config) return;

  editingSection = { page, listId, itemId, config };
  const modal = document.getElementById('sectionEditModal');
  const item = itemId
    ? (async () => {
        const blocks = await DB.getBlocks(page);
        return blocks[listBlockKey(listId)]?.data?.items?.find((i) => i.id === itemId) || {};
      })()
    : Promise.resolve({});

  item.then((data) => {
    document.getElementById('sectionEditTitle').textContent = itemId
      ? `Edit — ${config.label}`
      : `Add card — ${config.label}`;
    document.getElementById('sectionEditForm').innerHTML = buildListItemForm(config, data, { isNew: !itemId });
    modal?.classList.add('open');
    lockScroll();
  });
}

window.closeSectionModal = function() {
  document.getElementById('sectionEditModal')?.classList.remove('open');
  editingSection = null;
  unlockScroll();
};

window.saveSectionModal = async function() {
  if (!editingSection) return;
  const form = document.getElementById('sectionEditForm');
  const fd = new FormData(form);
  const { page, listId, itemId, config } = editingSection;
  const data = {};
  for (const [k, v] of fd.entries()) {
    if (k !== 'file' && v !== '') data[k] = v;
  }
  const file = fd.get('file');
  if (file?.size) data.image = await DB.uploadMedia(file);

  if (itemId) {
    const blocks = await DB.getBlocks(page);
    const prev = blocks[listBlockKey(listId)]?.data?.items?.find((i) => i.id === itemId);
    if (!data.image && prev?.image) data.image = prev.image;
    await updateListItem(page, listId, itemId, data);
  } else {
    await addListItem(page, listId, data);
  }

  closeSectionModal();
  renderSectionsTab();
};

function pageLabel(page) {
  return { index: 'Homepage', about: 'About', newsletter: 'Newsletter', locations: 'Locations' }[page] || page;
}

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
}

function escAttr(s) {
  return esc(s).replace(/"/g, '&quot;');
}
