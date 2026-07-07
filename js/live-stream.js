/* YouTube live stream page — polls for live broadcasts and embeds player + chat */

import { DB } from './data.js';

const DEFAULT_HANDLE = 'apostolicfaithbotswanahead3540';
const DEFAULT_POLL_SEC = 45;

let config = null;
let channelId = null;
let currentVideoId = null;
let pollTimer = null;
let playerIframe = null;

const els = {};

export function initLiveStreamPage() {
  cacheElements();
  loadConfigAndStart();
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('beforeunload', stopPolling);
}

function cacheElements() {
  els.statusPill = document.getElementById('liveStatusPill');
  els.syncNote = document.getElementById('liveSyncNote');
  els.layout = document.getElementById('liveLayout');
  els.playerWrap = document.getElementById('livePlayerWrap');
  els.title = document.getElementById('liveStreamTitle');
  els.desc = document.getElementById('liveStreamDesc');
  els.meta = document.getElementById('liveMeta');
  els.toolbar = document.getElementById('liveToolbar');
  els.chatFrame = document.getElementById('liveChatFrame');
  els.chatToggle = document.getElementById('liveChatToggle');
  els.offlineCard = document.getElementById('liveOfflineCard');
  els.offlineMsg = document.getElementById('liveOfflineMsg');
  els.latestWrap = document.getElementById('liveLatestWrap');
  els.setupNote = document.getElementById('liveSetupNote');
}

async function loadConfigAndStart() {
  try {
    config = await DB.getYouTubeConfig();
  } catch {
    config = {};
  }

  if (!config.channel_handle) config.channel_handle = DEFAULT_HANDLE;
  if (!config.poll_seconds) config.poll_seconds = DEFAULT_POLL_SEC;

  channelId = config.channel_id || null;

  if (!config.api_key) {
    showSetupNote(true);
    if (channelId) {
      mountChannelLiveFallback();
      setOfflineUI('Add a YouTube API key in Admin → Site Content to show stream titles and auto-detect when you go live.');
    } else {
      setOfflineUI('YouTube live is not configured yet. An admin must add the API key and channel handle in the dashboard.');
    }
    return;
  }

  showSetupNote(false);
  await refreshLiveState(true);
  startPolling();
}

function showSetupNote(show) {
  if (els.setupNote) els.setupNote.hidden = !show;
}

async function refreshLiveState(forcePlayer = false) {
  if (!config?.api_key) return;

  try {
    if (!channelId) {
      channelId = await resolveChannelId(config.channel_handle);
    }
    if (!channelId) throw new Error('Could not resolve YouTube channel ID');

    const live = await fetchLiveVideo(channelId);
    if (live) {
      const details = await fetchVideoDetails(live.id);
      showLiveUI(live, details, forcePlayer || live.id !== currentVideoId);
      currentVideoId = live.id;
      updateSyncNote('Synced with YouTube');
      return;
    }

    currentVideoId = null;
    const latest = await fetchLatestVideo(channelId);
    showOfflineUI(latest);
    updateSyncNote('Checked YouTube — not live right now');
  } catch (err) {
    console.warn('Live stream check failed:', err);
    updateSyncNote('Could not reach YouTube — retrying…');
    if (channelId && !currentVideoId) mountChannelLiveFallback();
  }
}

async function resolveChannelId(handle) {
  const h = String(handle || '').replace(/^@/, '');
  const url = `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${encodeURIComponent(h)}&key=${config.api_key}`;
  const res = await fetch(url);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message || 'YouTube API error');
  return json.items?.[0]?.id || null;
}

async function fetchLiveVideo(chId) {
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${encodeURIComponent(chId)}&eventType=live&type=video&maxResults=1&key=${config.api_key}`;
  const res = await fetch(url);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  const item = json.items?.[0];
  if (!item?.id?.videoId) return null;
  return {
    id: item.id.videoId,
    title: item.snippet?.title || 'Live Stream',
    description: item.snippet?.description || '',
    thumbnails: item.snippet?.thumbnails || {},
  };
}

async function fetchVideoDetails(videoId) {
  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails,statistics&id=${encodeURIComponent(videoId)}&key=${config.api_key}`;
  const res = await fetch(url);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.items?.[0] || null;
}

async function fetchLatestVideo(chId) {
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${encodeURIComponent(chId)}&order=date&type=video&maxResults=1&key=${config.api_key}`;
  const res = await fetch(url);
  const json = await res.json();
  const item = json.items?.[0];
  if (!item?.id?.videoId) return null;
  return {
    id: item.id.videoId,
    title: item.snippet?.title || 'Latest video',
    thumbnails: item.snippet?.thumbnails || {},
  };
}

function showLiveUI(live, details, remountPlayer) {
  els.layout?.classList.remove('is-offline');
  els.offlineCard?.setAttribute('hidden', '');

  setStatus(true);
  if (els.title) els.title.textContent = details?.snippet?.title || live.title;
  if (els.desc) {
    const desc = details?.snippet?.description || live.description || '';
    els.desc.textContent = desc.length > 600 ? `${desc.slice(0, 600)}…` : desc;
    els.desc.hidden = !desc;
  }

  const viewers = details?.liveStreamingDetails?.concurrentViewers;
  const started = details?.liveStreamingDetails?.actualStartTime;
  const views = details?.statistics?.viewCount;
  if (els.meta) {
    const parts = [];
    if (viewers) parts.push(`<span><strong>${formatNum(viewers)}</strong> watching now</span>`);
    if (started) parts.push(`<span>Started <strong>${formatRelativeTime(started)}</strong></span>`);
    if (views) parts.push(`<span><strong>${formatNum(views)}</strong> views</span>`);
    els.meta.innerHTML = parts.join('');
    els.meta.hidden = !parts.length;
  }

  if (remountPlayer) mountVideoPlayer(live.id);
  mountLiveChat(live.id);
  renderToolbar(live.id, true);
}

function showOfflineUI(latest, message) {
  els.layout?.classList.add('is-offline');
  els.offlineCard?.removeAttribute('hidden');

  setStatus(false);
  if (els.title) els.title.textContent = 'No live stream right now';
  if (els.desc) {
    els.desc.textContent = message || 'When Apostolic Faith Church Botswana goes live on YouTube, the stream will appear here automatically.';
    els.desc.hidden = false;
  }
  if (els.meta) {
    els.meta.innerHTML = '';
    els.meta.hidden = true;
  }

  unmountPlayer();
  if (els.chatFrame) els.chatFrame.src = 'about:blank';
  renderToolbar(null, false);

  if (els.latestWrap && latest) {
    const thumb = latest.thumbnails?.medium?.url || latest.thumbnails?.default?.url || '';
    const url = `https://www.youtube.com/watch?v=${latest.id}`;
    els.latestWrap.innerHTML = `
      <div class="live-latest-thumb">
        ${thumb ? `<img src="${esc(thumb)}" alt="">` : ''}
        <div>
          <div style="font-size:.78rem;color:#8899aa;margin-bottom:.25rem;">Latest upload</div>
          <a href="${url}" target="_blank" rel="noopener">${esc(latest.title)}</a>
        </div>
      </div>`;
    els.latestWrap.hidden = false;
  } else if (els.latestWrap) {
    els.latestWrap.hidden = true;
  }
}

function setOfflineUI(message) {
  showOfflineUI(null, message);
  setStatus(false);
}

function setStatus(isLive) {
  if (!els.statusPill) return;
  els.statusPill.textContent = isLive ? 'Live now' : 'Offline';
  els.statusPill.classList.toggle('is-live', isLive);
  els.statusPill.classList.toggle('is-offline', !isLive);
  document.title = isLive
    ? `Live — ${els.title?.textContent || 'AFC Botswana'}`
    : 'Live Stream — Apostolic Faith Church Botswana';
}

function mountVideoPlayer(videoId) {
  if (!els.playerWrap) return;
  const origin = encodeURIComponent(window.location.origin);
  const src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1&origin=${origin}`;
  if (playerIframe?.dataset?.videoId === videoId) return;

  els.playerWrap.innerHTML = '';
  playerIframe = document.createElement('iframe');
  playerIframe.src = src;
  playerIframe.title = 'YouTube live stream player';
  playerIframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  playerIframe.allowFullscreen = true;
  playerIframe.referrerPolicy = 'strict-origin-when-cross-origin';
  playerIframe.dataset.videoId = videoId;
  els.playerWrap.appendChild(playerIframe);
}

function mountChannelLiveFallback() {
  if (!els.playerWrap || !channelId) return;
  const src = `https://www.youtube.com/embed/live_stream?channel=${encodeURIComponent(channelId)}&autoplay=1&rel=0&modestbranding=1`;
  els.playerWrap.innerHTML = '';
  playerIframe = document.createElement('iframe');
  playerIframe.src = src;
  playerIframe.title = 'YouTube channel live stream';
  playerIframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  playerIframe.allowFullscreen = true;
  els.playerWrap.appendChild(playerIframe);
}

function unmountPlayer() {
  if (els.playerWrap) els.playerWrap.innerHTML = '';
  playerIframe = null;
}

function mountLiveChat(videoId) {
  if (!els.chatFrame) return;
  const domain = window.location.hostname;
  els.chatFrame.src = `https://www.youtube.com/live_chat?v=${encodeURIComponent(videoId)}&embed_domain=${encodeURIComponent(domain)}`;
}

function renderToolbar(videoId, isLive) {
  if (!els.toolbar) return;
  const channelUrl = `https://www.youtube.com/@${encodeURIComponent((config.channel_handle || DEFAULT_HANDLE).replace(/^@/, ''))}`;
  const watchUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : channelUrl;

  els.toolbar.innerHTML = `
    <a class="live-tool-btn primary" href="${watchUrl}" target="_blank" rel="noopener">Open on YouTube</a>
    <a class="live-tool-btn" href="${channelUrl}" target="_blank" rel="noopener">Subscribe</a>
    <button type="button" class="live-tool-btn" id="liveShareBtn">Share</button>
    ${isLive ? '<button type="button" class="live-tool-btn" id="liveTheaterBtn">Theater mode</button>' : ''}`;

  document.getElementById('liveShareBtn')?.addEventListener('click', () => {
    const url = isLive ? watchUrl : window.location.href;
    if (navigator.share) {
      navigator.share({ title: document.title, url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url);
      alert('Link copied to clipboard.');
    }
  });

  document.getElementById('liveTheaterBtn')?.addEventListener('click', () => {
    document.body.classList.toggle('live-theater');
    const btn = document.getElementById('liveTheaterBtn');
    if (btn) btn.textContent = document.body.classList.contains('live-theater') ? 'Exit theater' : 'Theater mode';
  });
}

function startPolling() {
  stopPolling();
  const ms = Math.max(30, Number(config.poll_seconds) || DEFAULT_POLL_SEC) * 1000;
  pollTimer = setInterval(() => refreshLiveState(false), ms);
}

function stopPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
}

function onVisibilityChange() {
  if (document.hidden) stopPolling();
  else {
    refreshLiveState(false);
    startPolling();
  }
}

function updateSyncNote(text) {
  if (els.syncNote) els.syncNote.textContent = text;
}

function formatNum(n) {
  return Number(n).toLocaleString();
}

function formatRelativeTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs} hr${hrs === 1 ? '' : 's'} ago`;
}

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
