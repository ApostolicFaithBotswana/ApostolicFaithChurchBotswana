/* Dynamic section lists — add/edit/delete cards per section with realtime sync */

import { DB } from './data.js';
import { icon } from './icons.js';
import {
  SECTION_LISTS, getListConfig, listBlockKey, FIELD_LABELS,
} from './section-lists-config.js';

const listsCache = {};
let currentPage = 'index';
let onUpdateCallback = null;

export function initSectionLists(pageId = 'index') {
  currentPage = pageId;
  return refreshAllLists(pageId);
}

export function setListsUpdateCallback(fn) {
  onUpdateCallback = fn;
}

export function getListsCache(page = currentPage) {
  return listsCache[page] || {};
}

export function getListItems(page, listId) {
  return listsCache[page]?.[listId]?.items || [];
}

export function getListItemContext(el) {
  const card = el?.closest?.('[data-list-item-id]');
  const container = el?.closest?.('[data-edit-list]');
  if (!card || !container) return null;
  const listId = container.dataset.editList;
  const page = document.body.dataset.page || currentPage;
  const config = getListConfig(page, listId);
  if (!config) return null;
  return {
    page,
    listId,
    itemId: card.dataset.listItemId,
    config,
    container,
    card,
  };
}

export async function refreshAllLists(pageId = currentPage) {
  const blocks = await DB.getBlocks(pageId);
  const pageLists = {};

  Object.values(SECTION_LISTS)
    .filter((c) => c.page === pageId)
    .forEach((config) => {
      const key = listBlockKey(config.id);
      const stored = blocks[key]?.data?.items;
      if (stored?.length) {
        pageLists[config.id] = { items: stored };
      }
    });

  listsCache[pageId] = pageLists;

  for (const config of Object.values(SECTION_LISTS).filter((c) => c.page === pageId)) {
    const container = document.querySelector(config.selector);
    if (!container) continue;

    let items = pageLists[config.id]?.items;
    if (!items?.length) {
      items = seedFromDom(container, config);
      if (items.length) {
        await saveListItems(pageId, config.id, items);
        listsCache[pageId][config.id] = { items };
      }
    }
    renderList(container, items, config, pageId);
  }

  onUpdateCallback?.(pageId);
  return pageLists;
}

export async function applyListBlocksFromCache(pageId, blocksCache) {
  listsCache[pageId] = listsCache[pageId] || {};
  let changed = false;

  for (const config of Object.values(SECTION_LISTS).filter((c) => c.page === pageId)) {
    const key = listBlockKey(config.id);
    const block = blocksCache[key];
    if (!block?.data?.items) continue;

    listsCache[pageId][config.id] = { items: block.data.items };
    const container = document.querySelector(config.selector);
    if (container) {
      renderList(container, block.data.items, config, pageId);
      changed = true;
    }
  }

  if (changed) onUpdateCallback?.(pageId);
}

export async function saveListItems(page, listId, items) {
  await DB.saveBlock(page, listBlockKey(listId), 'list', { items });
  listsCache[page] = listsCache[page] || {};
  listsCache[page][listId] = { items };
}

export async function addListItem(page, listId, data) {
  const config = getListConfig(page, listId);
  if (!config) throw new Error('Unknown section');
  const items = [...getListItems(page, listId)];
  const id = `${config.itemPrefix}-${Date.now().toString(36)}`;
  items.push({ id, ...data });
  await saveListItems(page, listId, items);
  const container = document.querySelector(config.selector);
  if (container) renderList(container, items, config, page);
  onUpdateCallback?.(page);
  return id;
}

export async function updateListItem(page, listId, itemId, data) {
  const config = getListConfig(page, listId);
  const items = getListItems(page, listId).map((item) =>
    item.id === itemId ? { ...item, ...data, id: itemId } : item
  );
  await saveListItems(page, listId, items);
  const container = document.querySelector(config.selector);
  if (container) renderList(container, items, config, page);
  onUpdateCallback?.(page);
}

export async function deleteListItem(page, listId, itemId) {
  const config = getListConfig(page, listId);
  const items = getListItems(page, listId).filter((item) => item.id !== itemId);
  await saveListItems(page, listId, items);
  const container = document.querySelector(config.selector);
  if (container) renderList(container, items, config, page);
  onUpdateCallback?.(page);
}

export function gatherItemFromElement(el, config) {
  const data = { id: el.dataset.listItemId || slugId() };
  if (config.cardType === 'image') {
    const img = el.querySelector('img') || el;
    data.image = img.src || '';
    data.alt = img.alt || '';
    return data;
  }
  config.fields.forEach((field) => {
    const child = el.querySelector(`[data-edit-field="${field}"]`);
    if (!child) return;
    if (field === 'image' && child.tagName === 'IMG') {
      data.image = child.src;
    } else if (field === 'branches') {
      data.branches = [...child.querySelectorAll('.sub-branch-tag, span')]
        .map((s) => s.textContent.trim()).filter(Boolean).join(', ');
    } else if (field === 'phone' && child.tagName === 'A') {
      data.phone = child.textContent.trim();
    } else if (field === 'link' && child.tagName === 'A') {
      data.link = child.getAttribute('href') || '';
    } else if (child.dataset.editFormat === 'html') {
      data[field] = child.innerHTML.trim();
    } else {
      data[field] = child.textContent.trim();
    }
  });
  if (config.linkInTitle) {
    const linkEl = el.querySelector('h3 a[data-edit-field="link"], a[data-edit-field="link"]');
    if (linkEl && !data.title) data.title = linkEl.textContent.trim();
  }
  if (!data.id) data.id = slugId();
  return data;
}

function seedFromDom(container, config) {
  const cards = container.querySelectorAll(':scope > [data-edit], :scope > [data-list-item-id]');
  return [...cards].map((el, i) => {
    const fromEdit = el.dataset.edit?.split('.').pop();
    const item = gatherItemFromElement(el, config);
    item.id = el.dataset.listItemId || fromEdit || `${config.itemPrefix}-${i + 1}`;
    return item;
  });
}

function renderList(container, items, config, page) {
  if (!items?.length) {
    container.innerHTML = '<p class="list-empty-hint">No cards yet.</p>';
    return;
  }

  const html = items.map((item, index) => {
    const interleave = config.interleaveHtml && index > 0 ? config.interleaveHtml : '';
    const reverse = config.alternateReverse && index % 2 === 1 ? ' reverse' : '';
    return interleave + renderCard(item, config, page, reverse, index);
  }).join('');

  container.innerHTML = html;
}

function renderCard(item, config, page, extraClass = '', index = 0) {
  const editKey = `${page}.${config.itemPrefix}.${item.id}`;
  const label = item.title || item.label || item.badge || config.label;
  const delay = config.cardClass === 'gallery-tile' ? ` style="--delay:${(index * 0.1).toFixed(1)}s"` : '';

  if (config.cardType === 'image') {
    return `<div class="${config.cardClass}${extraClass}"${delay} data-list-item-id="${escAttr(item.id)}" data-edit="${editKey}" data-edit-type="image" data-edit-label="${escAttr(label)}">
      <img src="${escAttr(item.image || '')}" alt="${escAttr(item.alt || '')}" loading="lazy" />
    </div>`;
  }

  if (config.cardType === 'timeline') {
    return `<div class="${config.cardClass}${extraClass}" data-list-item-id="${escAttr(item.id)}" data-edit="${editKey}" data-edit-type="timeline" data-edit-label="${escAttr(label)}">
      <div class="timeline-date" data-edit-field="date">${esc(item.date || '')}</div>
      <div class="timeline-content">
        <h3 data-edit-field="title">${esc(item.title || '')}</h3>
        <p data-edit-field="body">${esc(item.body || '')}</p>
      </div>
    </div>`;
  }

  if (config.cardType === 'panel') {
    return `<div class="${config.cardClass}${extraClass}" data-list-item-id="${escAttr(item.id)}" data-edit="${editKey}" data-edit-type="panel" data-edit-label="${escAttr(label)}">
      <div class="cycle-label" data-edit-field="label">${esc(item.label || '')}</div>
    </div>`;
  }

  if (config.cardType === 'event-card') {
    return `<div class="${config.cardClass}${extraClass}" data-list-item-id="${escAttr(item.id)}" data-edit="${editKey}" data-edit-type="event-card" data-edit-label="${escAttr(label)}">
      <div class="event-media"><img src="${escAttr(item.image || '')}" alt="${escAttr(item.title || '')}" loading="lazy" data-edit-field="image"></div>
      <div class="event-body">
        <div class="event-badge" data-edit-field="badge">${esc(item.badge || '')}</div>
        <h2 data-edit-field="title">${esc(item.title || '')}</h2>
        <div data-edit-field="body" data-edit-format="html">${item.body || ''}</div>
        <div class="event-accent" data-edit-field="accent">${esc(item.accent || '')}</div>
      </div>
    </div>`;
  }

  if (config.cardType === 'district') {
    const branches = String(item.branches || '').split(',').map((s) => s.trim()).filter(Boolean);
    const phone = item.phone || '';
    const tel = phone.replace(/\s/g, '');
    return `<div class="${config.cardClass}${extraClass}" data-list-item-id="${escAttr(item.id)}" data-edit="${editKey}" data-edit-type="district" data-edit-label="${escAttr(label)}">
      <div class="district-card-head"><div>
        <div class="district-name" data-edit-field="title">${esc(item.title || '')}</div>
        ${item.badge ? `<span class="district-hq-badge" data-edit-field="badge">${esc(item.badge)}</span>` : ''}
      </div></div>
      <div class="district-card-body">
        <div class="district-meta">
          <div class="district-meta-row"><div class="meta-icon"></div><div>
            <span class="meta-label">District Pastor</span>
            <span class="meta-value" data-edit-field="pastor">${esc(item.pastor || '')}</span>
          </div></div>
          ${phone ? `<div class="district-meta-row"><div class="meta-icon"></div><div>
            <span class="meta-label">Contact</span>
            <span class="meta-value"><a href="tel:${escAttr(tel)}" data-edit-field="phone">${esc(phone)}</a></span>
          </div></div>` : ''}
          <div class="district-meta-row"><div class="meta-icon"></div><div>
            <span class="meta-label">Location</span>
            <span class="meta-value" data-edit-field="address" data-edit-format="html">${item.address || ''}</span>
          </div></div>
          <div class="district-meta-row"><div class="meta-icon"></div><div>
            <span class="meta-label">Sunday Service</span>
            <span class="meta-value" data-edit-field="serviceTime">${esc(item.serviceTime || '')}</span>
          </div></div>
        </div>
        <div class="sub-branches-label">Branches in this district</div>
        <div class="sub-branches-list" data-edit-field="branches">${branches.map((b) => `<span class="sub-branch-tag">${esc(b)}</span>`).join('')}</div>
      </div>
    </div>`;
  }

  if (config.linkClass) {
    const linkText = item.linkText || (item.link ? 'Learn more →' : '');
    return `<div class="${config.cardClass}${extraClass}" data-list-item-id="${escAttr(item.id)}" data-edit="${editKey}" data-edit-type="card" data-edit-label="${escAttr(label)}">
      <h3 data-edit-field="title">${esc(item.title || '')}</h3>
      <p data-edit-field="body">${esc(item.body || '')}</p>
      ${item.link ? `<a href="${escAttr(item.link)}" class="${config.linkClass}" data-edit-field="link">${esc(linkText)}</a>` : ''}
    </div>`;
  }

  if (config.linkInTitle && item.link) {
    return `<div class="${config.cardClass}${extraClass}" data-list-item-id="${escAttr(item.id)}" data-edit="${editKey}" data-edit-type="card" data-edit-label="${escAttr(label)}">
      <div class="structure-icon">🌍</div>
      <h3><a href="${escAttr(item.link)}" target="_blank" rel="noopener" data-edit-field="link">${esc(item.title || '')}</a></h3>
      <p data-edit-field="body">${item.body || ''}</p>
    </div>`;
  }

  return `<div class="${config.cardClass}${extraClass}" data-list-item-id="${escAttr(item.id)}" data-edit="${editKey}" data-edit-type="card" data-edit-label="${escAttr(label)}">
    <h3 data-edit-field="title">${esc(item.title || '')}</h3>
    <p data-edit-field="body">${esc(item.body || '')}</p>
    ${item.link ? `<a href="${escAttr(item.link)}" data-edit-field="link">${esc(item.title || 'Link')}</a>` : ''}
  </div>`;
}

export function buildListItemForm(config, data = {}, options = {}) {
  const { isNew = false } = options;
  let html = '';
  const fields = config.fields || [];

  fields.forEach((field) => {
    const label = FIELD_LABELS[field] || field;
    const val = data[field] || '';

    if (field === 'image') {
      if (val) html += `<div class="img-upload-preview"><img src="${escAttr(val)}" alt=""><span class="img-upload-preview-label">Current photo</span></div>`;
      html += `<div class="form-group"><label>${isNew ? 'Upload photo' : 'Replace photo'}</label><input type="file" name="file" accept="image/*"></div>`;
      return;
    }
    if (field === 'body' && config.bodyHtml) {
      html += `<div class="form-group"><label>${label}</label><textarea name="body" rows="6">${esc(val)}</textarea></div>`;
      return;
    }
    if (field === 'body' || field === 'address' || field === 'quote' || String(val).length > 100) {
      html += `<div class="form-group"><label>${label}</label><textarea name="${field}" rows="4">${esc(val)}</textarea></div>`;
      return;
    }
    html += `<div class="form-group"><label>${label}</label><input type="text" name="${field}" value="${esc(val)}"></div>`;
  });

  if (fields.includes('image') && !html.includes('name="file"')) {
    html += `<div class="form-group"><label>Upload photo</label><input type="file" name="file" accept="image/*"></div>`;
  }

  return html;
}

export async function saveListItemFromForm(ctx, fd, itemId = null) {
  const { page, listId, config } = ctx;
  const data = {};
  for (const [k, v] of fd.entries()) {
    if (k !== 'file' && v !== '') data[k] = v;
  }

  const file = fd.get('file');
  if (file?.size) data.image = await DB.uploadMedia(file);

  if (config.cardType === 'image' && !data.image && itemId) {
    const prev = getListItems(page, listId).find((i) => i.id === itemId);
    if (prev?.image) data.image = prev.image;
  }

  if (itemId) {
    await updateListItem(page, listId, itemId, data);
  } else {
    await addListItem(page, listId, data);
  }
}

export function attachListToolbars(isAdmin) {
  document.querySelectorAll('[data-edit-list]').forEach((container) => {
    if (container.previousElementSibling?.classList?.contains('list-admin-toolbar')) {
      container.previousElementSibling.remove();
    }
    container.querySelector('.list-admin-toolbar')?.remove();
    container.classList.remove('has-list-toolbar');

    if (!isAdmin) return;

    const listId = container.dataset.editList;
    const page = document.body.dataset.page || currentPage;
    const config = getListConfig(page, listId);
    if (!config) return;

    const bar = document.createElement('div');
    bar.className = 'list-admin-toolbar';
    bar.innerHTML = `
      <span class="list-admin-label">${esc(config.label)}</span>
      <button type="button" class="list-add-btn" data-list-add="${escAttr(listId)}">${icon('edit', { size: 14 })} Add card</button>`;
    container.parentNode?.insertBefore(bar, container);
    container.classList.add('has-list-toolbar');

    bar.querySelector('[data-list-add]')?.addEventListener('click', (e) => {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('afc:add-list-item', { detail: { page, listId } }));
    });
  });

  document.querySelectorAll('.list-delete-btn').forEach((b) => b.remove());
  if (isAdmin) attachListDeleteButtons();
}

function attachListDeleteButtons() {
  document.querySelectorAll('[data-list-item-id]').forEach((card) => {
    if (card.querySelector('.list-delete-btn')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'list-delete-btn';
    btn.title = 'Remove this card';
    btn.innerHTML = icon('trash', { size: 14 });
    btn.onclick = async (e) => {
      e.stopPropagation();
      e.preventDefault();
      const ctx = getListItemContext(card);
      if (!ctx || !confirm('Remove this card from the section?')) return;
      await deleteListItem(ctx.page, ctx.listId, ctx.itemId);
      window.dispatchEvent(new CustomEvent('afc:lists-changed'));
    };
    card.classList.add('live-editable');
    card.appendChild(btn);
  });
}

function slugId() {
  return `item-${Math.random().toString(36).slice(2, 9)}`;
}

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escAttr(s) {
  return esc(s).replace(/"/g, '&quot;');
}
