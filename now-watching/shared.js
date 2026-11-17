// Logic shared by the background worker and the popup.

export const DEFAULT_SETTINGS = {
  online: true,        // keep tracking the current page
  cleanLinks: true,    // strip tracking junk (utm_*, fbclid, si, ...)
  timestamps: true,    // add the current video time on YouTube
};

const TRACKING_PARAMS = [
  /^utm_/i, /^fbclid$/i, /^gclid$/i, /^dclid$/i, /^msclkid$/i, /^igshid$/i,
  /^mc_(cid|eid)$/i, /^si$/i, /^feature$/i, /^ref_src$/i, /^pp$/i,
];

export function isShareable(url) {
  return typeof url === 'string' && /^(https?|ftp):\/\//i.test(url);
}

export function cleanUrl(raw) {
  try {
    const u = new URL(raw);
    for (const key of [...u.searchParams.keys()]) {
      if (TRACKING_PARAMS.some((re) => re.test(key))) u.searchParams.delete(key);
    }
    return u.toString();
  } catch {
    return raw;
  }
}

export function isYouTube(url) {
  try {
    const h = new URL(url).hostname.replace(/^www\.|^m\./, '');
    return h === 'youtube.com' || h === 'youtu.be' || h === 'music.youtube.com';
  } catch {
    return false;
  }
}

export function withTimestamp(raw, seconds) {
  if (!seconds || seconds < 2 || !isYouTube(raw)) return raw;
  try {
    const u = new URL(raw);
    u.searchParams.set('t', `${Math.floor(seconds)}s`);
    return u.toString();
  } catch {
    return raw;
  }
}

export function formatTime(s) {
  s = Math.floor(s);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

// Read the playing position of the main <video> on the page (needs activeTab).
export async function readVideoTime(tabId) {
  try {
    const [res] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const vids = [...document.querySelectorAll('video')]
          .filter((v) => v.duration > 0 && v.currentTime > 0)
          .sort((a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight);
        return vids.length ? vids[0].currentTime : 0;
      },
    });
    return res?.result || 0;
  } catch {
    return 0; // no access (e.g. store pages) or no video
  }
}

export async function getSettings() {
  const { settings } = await chrome.storage.local.get('settings');
  return { ...DEFAULT_SETTINGS, ...(settings || {}) };
}

// Build the link to send, applying the user's settings.
export async function buildShareLink(page, settings, tabId) {
  let url = page.url;
  if (settings.cleanLinks) url = cleanUrl(url);
  let seconds = 0;
  if (settings.timestamps && tabId != null && isYouTube(url)) {
    seconds = await readVideoTime(tabId);
    url = withTimestamp(url, seconds);
  }
  return { url, seconds };
}
