import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExtensionMessage, MessageResponse, SavedVideo } from '../lib/types';

type MessageListener = (
  message: ExtensionMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: MessageResponse) => void
) => boolean;

const storedValues: Record<string, unknown> = {};
let messageListener: MessageListener;

const fakeChrome = {
  storage: {
    local: {
      get: vi.fn(async (key: string) => ({ [key]: storedValues[key] })),
      set: vi.fn(async (values: Record<string, unknown>) => Object.assign(storedValues, values))
    }
  },
  action: {
    setBadgeBackgroundColor: vi.fn(async () => undefined),
    setBadgeText: vi.fn(async () => undefined),
    setIcon: vi.fn(async () => undefined)
  },
  runtime: {
    onInstalled: { addListener: vi.fn() },
    onStartup: { addListener: vi.fn() },
    onMessage: {
      addListener: vi.fn((listener: MessageListener) => {
        messageListener = listener;
      })
    }
  }
};

function dispatch(message: ExtensionMessage): Promise<MessageResponse> {
  return new Promise((resolve) => {
    const keepsChannelOpen = messageListener(message, {} as chrome.runtime.MessageSender, resolve);
    if (!keepsChannelOpen) throw new Error('Background listener closed before responding.');
  });
}

function makeVideo(id: string): SavedVideo {
  return {
    id,
    title: `Video ${id}`,
    url: `https://www.youtube.com/watch?v=${id}`,
    thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    channel: 'Channel',
    duration: '1:00',
    position: 0,
    savedAt: 100
  };
}

beforeAll(async () => {
  vi.stubGlobal('chrome', fakeChrome as unknown as typeof chrome);
  await import('./index');
});

beforeEach(() => {
  for (const key of Object.keys(storedValues)) delete storedValues[key];
  vi.clearAllMocks();
});

describe('extension background integration', () => {
  it('persists only the newest 20 START_SESSION messages', async () => {
    for (let index = 0; index < 21; index += 1) {
      await dispatch({ type: 'START_SESSION', sessionId: `session-${index}`, startedAt: index });
    }

    const response = await dispatch({ type: 'GET_STATE' });
    expect(response.state?.history.sessions).toHaveLength(20);
    expect(response.state?.history.sessions[0].id).toBe('session-20');
    expect(response.state?.history.sessions.at(-1)?.id).toBe('session-1');
  });

  it('deduplicates SAVE_VIDEOS messages before writing storage', async () => {
    await dispatch({ type: 'START_SESSION', sessionId: 'current', startedAt: 1 });
    const first = await dispatch({ type: 'SAVE_VIDEOS', sessionId: 'current', videos: [makeVideo('same')] });
    const second = await dispatch({ type: 'SAVE_VIDEOS', sessionId: 'current', videos: [makeVideo('same')] });
    const state = await dispatch({ type: 'GET_STATE' });

    expect(first.addedCount).toBe(1);
    expect(second.addedCount).toBe(0);
    expect(state.state?.history.sessions[0].videos).toHaveLength(1);
  });

  it('does not create sessions while capture is paused', async () => {
    await dispatch({ type: 'SET_ENABLED', enabled: false });
    const response = await dispatch({ type: 'START_SESSION', sessionId: 'paused', startedAt: 1 });
    const state = await dispatch({ type: 'GET_STATE' });

    expect(response.enabled).toBe(false);
    expect(state.state?.history.sessions).toHaveLength(0);
  });

  it('keeps new YouTube tabs as separate loads in one shared history', async () => {
    await Promise.all([
      dispatch({ type: 'START_SESSION', sessionId: 'tab-a', startedAt: 100 }),
      dispatch({ type: 'START_SESSION', sessionId: 'tab-b', startedAt: 200 })
    ]);
    await Promise.all([
      dispatch({ type: 'SAVE_VIDEOS', sessionId: 'tab-a', videos: [makeVideo('from-tab-a')] }),
      dispatch({ type: 'SAVE_VIDEOS', sessionId: 'tab-b', videos: [makeVideo('from-tab-b')] })
    ]);

    const response = await dispatch({ type: 'GET_STATE' });
    const sessions = response.state?.history.sessions ?? [];
    expect(new Set(sessions.map((session) => session.id))).toEqual(new Set(['tab-a', 'tab-b']));
    expect(sessions.find((session) => session.id === 'tab-a')?.videos[0].id).toBe('from-tab-a');
    expect(sessions.find((session) => session.id === 'tab-b')?.videos[0].id).toBe('from-tab-b');
  });
});
