// Keeps track of the page you're on in the focused window.
import { getSettings, isShareable, buildShareLink } from './shared.js';

const HISTORY_MAX = 15;
// Firefox for Android has a single window and no windows/commands APIs.
const HAS_WINDOWS = !!chrome.windows;

async function remember(tab) {
  if (!tab || !tab.active || !isShareable(tab.url)) return;
  const settings = await getSettings();
  if (!settings.online) return;

  const page = {
    url: tab.url,
    title: tab.title || tab.url,
    favIconUrl: tab.favIconUrl || '',
    tabId: tab.id,
    at: Date.now(),
  };
  const { current, history = [] } = await chrome.storage.local.get(['current', 'history']);
  // Ignore no-op updates (same page, nothing new).
  if (current && current.url === page.url && current.title === page.title && current.favIconUrl === page.favIconUrl) return;

  const nextHistory = [page, ...history.filter((p) => p.url !== page.url)].slice(0, HISTORY_MAX);
  await chrome.storage.local.set({ current: page, history: nextHistory });
}

async function rememberActive() {
  try {
    const query = HAS_WINDOWS ? { active: true, lastFocusedWindow: true } : { active: true };
    const [tab] = await chrome.tabs.query(query);
    await remember(tab);
  } catch { /* window closing etc. */ }
}

chrome.tabs.onActivated.addListener(rememberActive);
if (HAS_WINDOWS) {
  chrome.windows.onFocusChanged.addListener((winId) => {
    if (winId !== chrome.windows.WINDOW_ID_NONE) rememberActive();
  });
}
chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  if (!('url' in info || 'title' in info || 'favIconUrl' in info)) return;
  if (!HAS_WINDOWS) return remember(tab); // remember() ignores background tabs
  const win = await chrome.windows.get(tab.windowId).catch(() => null);
  if (win?.focused) remember(tab);
});

async function setBadge(text, color) {
  try {
    await chrome.action.setBadgeBackgroundColor({ color });
    await chrome.action.setBadgeText({ text });
  } catch { /* badges aren't shown on mobile */ }
}

async function refreshBadge() {
  const { online } = await getSettings();
  await setBadge(online ? '' : 'OFF', '#6b7280');
}

chrome.runtime.onInstalled.addListener(() => { refreshBadge(); rememberActive(); });
chrome.runtime.onStartup.addListener(() => { refreshBadge(); rememberActive(); });
chrome.storage.onChanged.addListener((changes) => {
  if (changes.settings) { refreshBadge(); rememberActive(); }
});

// ---- Keyboard shortcut: copy the link without opening anything ----

async function writeClipboard(text) {
  if (chrome.offscreen) {
    // Chrome / Edge: service workers have no clipboard, use an offscreen page.
    if (!(await chrome.offscreen.hasDocument?.())) {
      await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['CLIPBOARD'],
        justification: 'Copy the current page link to the clipboard',
      });
    }
    const res = await chrome.runtime.sendMessage({ target: 'offscreen', type: 'copy', text });
    if (!res?.ok) throw new Error(res?.error || 'copy failed');
  } else {
    // Firefox background pages can write to the clipboard directly.
    await navigator.clipboard.writeText(text);
  }
}

async function flash(text, color) {
  await setBadge(text, color);
  setTimeout(refreshBadge, 1500);
}

chrome.commands?.onCommand.addListener(async (command) => {
  if (command !== 'copy-current-link') return;
  try {
    const settings = await getSettings();
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    let page = isShareable(tab?.url) ? { url: tab.url, title: tab.title } : null;
    if (!page) ({ current: page } = await chrome.storage.local.get('current'));
    if (!page) return flash('—', '#6b7280');
    const usesTab = tab && page.url === tab.url ? tab.id : null;
    const { url } = await buildShareLink(page, settings, usesTab);
    await writeClipboard(url);
    flash('✓', '#16a34a');
  } catch (e) {
    console.warn('Now Watching: copy failed', e);
    flash('!', '#dc2626');
  }
});
