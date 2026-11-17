// Hidden page used by Chrome/Edge to write to the clipboard from the shortcut.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.target !== 'offscreen' || msg.type !== 'copy') return;
  try {
    const buf = document.getElementById('buf');
    buf.value = msg.text;
    buf.select();
    const ok = document.execCommand('copy'); // offscreen docs can't focus, so no navigator.clipboard
    sendResponse({ ok });
  } catch (e) {
    sendResponse({ ok: false, error: String(e) });
  }
});
