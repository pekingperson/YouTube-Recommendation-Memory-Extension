import { SETTINGS_KEY } from '../lib/storage';
import type { ExtensionSettings, SavedVideo } from '../lib/types';
import { sendMessage } from '../lib/runtime';
import { CARD_SELECTORS, extractVideoCard } from '../lib/youtubeDom';
import { isYouTubeHomepage } from '../lib/youtube';

let observer: MutationObserver | null = null;
let scanTimer: number | null = null;
let periodicScan: number | null = null;
let sessionId: string | null = null;
let wasHome = isHomepage();
let captureEnabled = true;
let seenVideoIds = new Set<string>();
let nextPosition = 0;

function isHomepage(): boolean {
  return isYouTubeHomepage(location.href);
}

async function scanPage(): Promise<void> {
  scanTimer = null;
  if (!captureEnabled || !sessionId || !isHomepage()) return;

  const additions: SavedVideo[] = [];
  document.querySelectorAll(CARD_SELECTORS).forEach((card) => {
    const video = extractVideoCard(card, nextPosition, Date.now(), location.origin);
    if (!video || seenVideoIds.has(video.id)) return;
    seenVideoIds.add(video.id);
    nextPosition += 1;
    additions.push(video);
  });

  if (additions.length > 0) {
    await sendMessage({ type: 'SAVE_VIDEOS', sessionId, videos: additions });
  }
}

function scheduleScan(): void {
  if (scanTimer !== null) window.clearTimeout(scanTimer);
  scanTimer = window.setTimeout(() => void scanPage(), 350);
}

function stopCapture(): void {
  observer?.disconnect();
  observer = null;
  if (scanTimer !== null) window.clearTimeout(scanTimer);
  if (periodicScan !== null) window.clearInterval(periodicScan);
  scanTimer = null;
  periodicScan = null;
  sessionId = null;
  seenVideoIds = new Set();
  nextPosition = 0;
}

async function startCapture(): Promise<void> {
  if (!captureEnabled || !isHomepage() || sessionId) return;

  const id = crypto.randomUUID();
  const response = await sendMessage({ type: 'START_SESSION', sessionId: id, startedAt: Date.now() });
  if (!response.ok || response.enabled === false || !isHomepage()) return;

  sessionId = id;
  observer = new MutationObserver(scheduleScan);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  periodicScan = window.setInterval(() => void scanPage(), 2_500);
  await scanPage();
}

function handleNavigation(): void {
  const nowHome = isHomepage();
  if (nowHome && !wasHome) void startCapture();
  if (!nowHome && wasHome) stopCapture();
  wasHome = nowHome;
}

document.addEventListener('yt-navigate-finish', handleNavigation);
window.addEventListener('popstate', handleNavigation);

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local' || !changes[SETTINGS_KEY]) return;
  const settings = changes[SETTINGS_KEY].newValue as ExtensionSettings | undefined;
  captureEnabled = settings?.captureEnabled ?? true;
  if (captureEnabled && isHomepage()) void startCapture();
  if (!captureEnabled) stopCapture();
});

void startCapture();
