# Now Watching

A small browser extension that always keeps the link of the page you're on.
When someone asks "what are you watching?", you can copy and send it in one click or one shortcut.

## What it does

- **Tracks your current page** while it's **Online**. You can switch it off any time, and the icon then shows `OFF`.
- **One-click copy**: click the icon, then **Copy link**. Or press **Alt+Shift+L** anywhere to copy without opening anything. The icon flashes ✓ when the link is copied.
- **YouTube timestamps**: if a video is playing, the link opens at the moment you're at (`&t=754s`).
- **Clean links**: removes tracking junk such as `utm_*`, `fbclid` and YouTube's `si=`.
- **Recent list**: your last 15 pages. Click one to copy it.
- If you're on a new tab or a settings page, it shares the **last real page** you were on.

Everything stays in your browser (`chrome.storage.local`). Nothing is sent anywhere.

## Install (Chrome, Edge, Brave, Opera)

1. Download this `now-watching` folder.
2. Open `chrome://extensions` (`edge://extensions` in Edge).
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and pick the `now-watching` folder.
5. Pin the icon from the puzzle-piece menu so it's one click away.

## Install (Firefox 121+)

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…** and pick `manifest.json` in this folder.

   Firefox removes temporary add-ons when it restarts. To keep it installed, it needs to be signed through addons.mozilla.org.

## Android (Firefox for Android 128+)

Chrome for Android doesn't support extensions, so on Android this runs in **Firefox**.
Tap **⋮ → Extensions → Now Watching** to open it. On phones, **Share…** opens Android's share menu.

Firefox for Android only installs **signed** add-ons, so testing needs one of these:

- **Sign it (free, a few minutes):** zip the *contents* of this folder (so `manifest.json` sits at the top of the zip). Upload it at addons.mozilla.org → Developer Hub → *Submit a New Add-on* → **On your own** (unlisted). Download the signed `.xpi` to your phone. In Firefox go to **Settings → About Firefox**, tap the logo 5 times, then go back to **Settings → Install add-on from file** and pick the `.xpi`.
- **From a computer over USB:** install Mozilla's `web-ext` tool and turn on USB debugging on the phone. Then run `web-ext run -t firefox-android --android-device <id>` in this folder.

It only sees pages open **in Firefox**. Android doesn't let apps read what's playing in other apps (such as the YouTube app).

## Shortcuts

| Shortcut | Action |
| --- | --- |
| `Alt+Shift+L` | Copy the current link |
| `Alt+Shift+W` | Open the popup (if your browser assigned it) |

To change them: `chrome://extensions/shortcuts` in Chrome. In Firefox, go to Add-ons → ⚙ → Manage Extension Shortcuts.

## Files

- `background.js`: watches tab switches and page changes, and handles the copy shortcut.
- `popup.html / .css / .js`: the window you see when you click the icon.
- `shared.js`: link cleaning, YouTube timestamps and settings.
- `mobile.js`: switches the popup to the phone layout.
- `offscreen.html / .js`: hidden page Chrome needs to copy to the clipboard from the shortcut.
