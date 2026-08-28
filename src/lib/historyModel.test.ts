import { describe, expect, it } from 'vitest';
import { addVideos, createEmptyHistory, MAX_SESSIONS, normalizeHistory, startSession } from './historyModel';
import type { SavedVideo } from './types';

function video(id: string, savedAt = 1): SavedVideo {
  return {
    id,
    title: `Video ${id}`,
    url: `https://www.youtube.com/watch?v=${id}`,
    thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    channel: 'Channel',
    duration: '4:20',
    position: 0,
    savedAt
  };
}

describe('recommendation history', () => {
  it('keeps only the newest 20 homepage loads', () => {
    let history = createEmptyHistory();
    for (let index = 0; index < MAX_SESSIONS + 1; index += 1) {
      history = startSession(history, `session-${index}`, index);
    }

    expect(history.sessions).toHaveLength(20);
    expect(history.sessions[0].id).toBe('session-20');
    expect(history.sessions.at(-1)?.id).toBe('session-1');
  });

  it('deduplicates a video within one load', () => {
    const started = startSession(createEmptyHistory(), 'current', 1);
    const result = addVideos(started, 'current', [video('abc'), video('abc'), video('def', 2)]);

    expect(result.addedCount).toBe(2);
    expect(result.history.sessions[0].videos.map((item) => item.id)).toEqual(['abc', 'def']);
  });

  it('allows the same recommendation to appear in separate loads', () => {
    let history = startSession(createEmptyHistory(), 'first', 1);
    history = addVideos(history, 'first', [video('same')]).history;
    history = startSession(history, 'second', 2);
    history = addVideos(history, 'second', [video('same')]).history;

    expect(history.sessions[0].videos[0].id).toBe('same');
    expect(history.sessions[1].videos[0].id).toBe('same');
  });

  it('recovers safely from corrupt storage', () => {
    expect(normalizeHistory(null)).toEqual(createEmptyHistory());
    expect(normalizeHistory({ sessions: 'bad' })).toEqual(createEmptyHistory());
  });
});
