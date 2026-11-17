import { getSettings, isShareable, buildShareLink, cleanUrl, formatTime, isYouTube, readVideoTime } from './shared.js';

const $ = (id) => document.getElementById(id);
let settings;
let page = null;       // the page we'd share
let tabId = null;      // tab of that page, if it's the one in front (for video time)

function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), 1400);
}

function ago(ts) {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function host(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

async function copy(text, label = 'Link copied') {
  try {
    await navigator.clipboard.writeText(text);
    toast(label);
  } catch {
    toast('Could not copy');
  }
}

async function shareLink() {
  return buildShareLink(page, settings, tabId);
}

async function renderCard() {
  const card = $('card');
  card.classList.toggle('paused', !settings.online);
  const has = !!page;
  for (const id of ['copy', 'copyTitle', 'share']) $(id).disabled = !has;
  if (!has) {
    $('title').textContent = settings.online ? 'Nothing yet' : 'Offline';
    $('url').textContent = settings.online
      ? 'Open a page and it will show up here.'
      : 'Turn on Online to keep track of your page.';
    $('fav').removeAttribute('src');
    $('stamp').hidden = true;
    return;
  }
  $('title').textContent = page.title || page.url;
  $('url').textContent = settings.cleanLinks ? cleanUrl(page.url) : page.url;
  $('url').title = page.url;
  if (page.favIconUrl) $('fav').src = page.favIconUrl; else $('fav').removeAttribute('src');

  const stamp = $('stamp');
  stamp.hidden = true;
  if (settings.timestamps && tabId != null && isYouTube(page.url)) {
    const s = await readVideoTime(tabId);
    if (s >= 2) { stamp.textContent = formatTime(s); stamp.hidden = false; }
  }
}

function renderHistory(history) {
  const ul = $('history');
  ul.replaceChildren();
  if (!history.length) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = 'Pages you visit will be listed here.';
    ul.append(li);
    return;
  }
  for (const p of history) {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.title = `Copy ${p.url}`;
    const img = document.createElement('img');
    if (p.favIconUrl) img.src = p.favIconUrl; else img.style.visibility = 'hidden';
    img.alt = '';
    const t = document.createElement('span');
    t.className = 't';
    t.textContent = p.title || host(p.url);
    const a = document.createElement('span');
    a.className = 'ago';
    a.textContent = ago(p.at);
    b.append(img, t, a);
    b.addEventListener('click', () => copy(settings.cleanLinks ? cleanUrl(p.url) : p.url));
    li.append(b);
    ul.append(li);
  }
}

async function load() {
  settings = await getSettings();
  const { current, history = [] } = await chrome.storage.local.get(['current', 'history']);

  // Prefer the tab in front of you; fall back to the last page we remembered
  // (e.g. when you're on a new tab or a settings page).
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (settings.online && tab && isShareable(tab.url)) {
    page = { url: tab.url, title: tab.title, favIconUrl: tab.favIconUrl };
    tabId = tab.id;
  } else if (settings.online && current) {
    page = current;
    tabId = null;
  } else {
    page = null;
  }

  $('online').checked = settings.online;
  $('onlineLabel').textContent = settings.online ? 'Online' : 'Offline';
  $('dot').classList.toggle('live', settings.online);
  $('timestamps').checked = settings.timestamps;
  $('cleanLinks').checked = settings.cleanLinks;
  $('share').hidden = !navigator.share;

  await renderCard();
  renderHistory(history);
}

async function saveSetting(key, value) {
  settings[key] = value;
  await chrome.storage.local.set({ settings });
  await load();
}

$('copy').addEventListener('click', async () => {
  const { url, seconds } = await shareLink();
  copy(url, seconds >= 2 ? `Link copied at ${formatTime(seconds)}` : 'Link copied');
});

$('copyTitle').addEventListener('click', async () => {
  const { url } = await shareLink();
  copy(`${page.title} — ${url}`, 'Title + link copied');
});

$('share').addEventListener('click', async () => {
  const { url } = await shareLink();
  try { await navigator.share({ title: page.title, url }); } catch { /* cancelled */ }
});

$('online').addEventListener('change', (e) => saveSetting('online', e.target.checked));
$('timestamps').addEventListener('change', (e) => saveSetting('timestamps', e.target.checked));
$('cleanLinks').addEventListener('change', (e) => saveSetting('cleanLinks', e.target.checked));

$('clear').addEventListener('click', async () => {
  await chrome.storage.local.set({ history: [] });
  renderHistory([]);
});

$('shortcuts').addEventListener('click', (e) => {
  e.preventDefault();
  const isFirefox = navigator.userAgent.includes('Firefox');
  if (isFirefox) {
    toast('Firefox: Add-ons → ⚙ → Manage Extension Shortcuts');
  } else {
    chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
  }
});

chrome.commands?.getAll?.().then((cmds) => {
  const c = cmds.find((x) => x.name === 'copy-current-link');
  $('kbd').textContent = c?.shortcut || 'not set';
});

load();
