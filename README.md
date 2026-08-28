# Recommendation Memory for YouTube

A Chrome/Edge extension that automatically saves the video cards shown on your YouTube homepage. Each full page load (or return to Home in YouTube's in-page navigation) becomes a separate saved shelf. As you scroll and YouTube loads more cards, they are added to that shelf.

The extension keeps the newest **20 homepage loads** and automatically removes the oldest load when a 21st is created.

## Install the ready-to-use extension

### Chrome

1. Open `chrome://extensions`.
2. Turn on **Developer mode** in the upper-right corner.
3. Click **Load unpacked**.
4. Select the `dist` folder in this project.
5. Pin **Recommendation Memory** from Chrome's Extensions menu.

### Microsoft Edge

1. Open `edge://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked**.
4. Select the `dist` folder in this project.

Once installed, visit `https://www.youtube.com/` in any tab. Capturing is automatic. Click the extension icon for a quick view, or click **View all history** for the complete searchable archive.

The toolbar popup is available on every browser tab, including non-YouTube sites. From it you can open a saved load or click any saved video/thumbnail to open that video in a new tab.

## What it saves

- Video title and direct YouTube link
- Stable YouTube thumbnail link
- Channel name and duration when available
- Which homepage load showed the video and when it was captured

All data stays in `chrome.storage.local` on this browser. The extension does not send data to a server, read your YouTube account, or add tracking. Removing the extension also removes its saved history.

## Behavior notes

- A video is saved once per homepage load, even if YouTube renders the same card more than once.
- Opening YouTube Home in a new tab creates a separate saved load. Multiple YouTube tabs share the same 20-load history safely.
- Automatic capture runs only on YouTube Home. The Subscriptions feed, video pages, Shorts pages, search results, and other YouTube sections are ignored.
- The same video can appear in more than one load; this preserves what each recommendation slate contained.
- Capture can be paused from the extension popup.
- Clearing history or deleting a load asks for confirmation.

## Development

```powershell
npm install
npm test
npm run build
```

The production extension is written to `dist`.
