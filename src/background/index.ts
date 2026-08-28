import { addVideos, createEmptyHistory, deleteSession, startSession } from '../lib/historyModel';
import {
  readHistory,
  readSettings,
  readState,
  writeHistory,
  writeSettings
} from '../lib/storage';
import type { ExtensionMessage, MessageResponse } from '../lib/types';

let mutationQueue: Promise<unknown> = Promise.resolve();

function queueMutation<T>(operation: () => Promise<T>): Promise<T> {
  const result = mutationQueue.then(operation, operation);
  mutationQueue = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

async function updateBadge(): Promise<void> {
  const history = await readHistory();
  const count = history.sessions[0]?.videos.length ?? 0;
  await chrome.action.setBadgeBackgroundColor({ color: '#d92d20' });
  await chrome.action.setBadgeText({ text: count ? String(Math.min(count, 999)) : '' });
}

function drawActionIcon(size: number): ImageData {
  const canvas = new OffscreenCanvas(size, size);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not create the extension icon.');

  context.fillStyle = '#d92d20';
  context.beginPath();
  context.roundRect(0, 0, size, size, size * 0.27);
  context.fill();

  context.fillStyle = '#ffffff';
  context.beginPath();
  context.moveTo(size * 0.4, size * 0.29);
  context.lineTo(size * 0.4, size * 0.71);
  context.lineTo(size * 0.72, size * 0.5);
  context.closePath();
  context.fill();

  return context.getImageData(0, 0, size, size);
}

async function updateActionIcon(): Promise<void> {
  await chrome.action.setIcon({
    imageData: {
      16: drawActionIcon(16),
      32: drawActionIcon(32)
    }
  });
}

async function handleMessage(message: ExtensionMessage): Promise<MessageResponse> {
  switch (message.type) {
    case 'GET_STATE':
      return { ok: true, state: await readState() };

    case 'START_SESSION':
      return queueMutation(async () => {
        const settings = await readSettings();
        if (!settings.captureEnabled) return { ok: true, enabled: false };

        const next = startSession(await readHistory(), message.sessionId, message.startedAt);
        await writeHistory(next);
        await updateBadge();
        return { ok: true, enabled: true };
      });

    case 'SAVE_VIDEOS':
      return queueMutation(async () => {
        const settings = await readSettings();
        if (!settings.captureEnabled) return { ok: true, enabled: false, addedCount: 0 };

        const result = addVideos(await readHistory(), message.sessionId, message.videos);
        if (result.addedCount > 0) {
          await writeHistory(result.history);
          await updateBadge();
        }
        return { ok: true, enabled: true, addedCount: result.addedCount };
      });

    case 'SET_ENABLED':
      return queueMutation(async () => {
        await writeSettings({ captureEnabled: message.enabled });
        return { ok: true, enabled: message.enabled };
      });

    case 'DELETE_SESSION':
      return queueMutation(async () => {
        await writeHistory(deleteSession(await readHistory(), message.sessionId));
        await updateBadge();
        return { ok: true };
      });

    case 'CLEAR_HISTORY':
      return queueMutation(async () => {
        await writeHistory(createEmptyHistory());
        await updateBadge();
        return { ok: true };
      });
  }
}

chrome.runtime.onInstalled.addListener(() => {
  void updateBadge();
  void updateActionIcon();
});

chrome.runtime.onStartup.addListener(() => {
  void updateBadge();
  void updateActionIcon();
});

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse: (response: MessageResponse) => void) => {
    void handleMessage(message)
      .then(sendResponse)
      .catch((error: unknown) => {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : 'Unknown extension error'
        });
      });
    return true;
  }
);
