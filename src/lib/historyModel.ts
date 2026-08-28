import type {
  RecommendationHistory,
  RecommendationSession,
  SavedVideo
} from './types';

export const MAX_SESSIONS = 20;

export function createEmptyHistory(): RecommendationHistory {
  return { version: 1, sessions: [] };
}

export function normalizeHistory(value: unknown): RecommendationHistory {
  if (!value || typeof value !== 'object') return createEmptyHistory();

  const candidate = value as Partial<RecommendationHistory>;
  if (!Array.isArray(candidate.sessions)) return createEmptyHistory();

  const sessions = candidate.sessions
    .filter(isSession)
    .slice(0, MAX_SESSIONS)
    .map((session) => ({
      ...session,
      videos: session.videos.filter(isVideo)
    }));

  return { version: 1, sessions };
}

function isSession(value: unknown): value is RecommendationSession {
  if (!value || typeof value !== 'object') return false;
  const session = value as Partial<RecommendationSession>;
  return (
    typeof session.id === 'string' &&
    typeof session.startedAt === 'number' &&
    typeof session.lastSeenAt === 'number' &&
    Array.isArray(session.videos)
  );
}

function isVideo(value: unknown): value is SavedVideo {
  if (!value || typeof value !== 'object') return false;
  const video = value as Partial<SavedVideo>;
  return (
    typeof video.id === 'string' &&
    typeof video.title === 'string' &&
    typeof video.url === 'string' &&
    typeof video.thumbnailUrl === 'string' &&
    typeof video.savedAt === 'number'
  );
}

export function startSession(
  history: RecommendationHistory,
  sessionId: string,
  startedAt: number
): RecommendationHistory {
  const existing = history.sessions.find((session) => session.id === sessionId);
  if (existing) return history;

  const session: RecommendationSession = {
    id: sessionId,
    startedAt,
    lastSeenAt: startedAt,
    videos: []
  };

  return {
    version: 1,
    sessions: [session, ...history.sessions].slice(0, MAX_SESSIONS)
  };
}

export function addVideos(
  history: RecommendationHistory,
  sessionId: string,
  incoming: SavedVideo[]
): { history: RecommendationHistory; addedCount: number } {
  let addedCount = 0;
  const sessions = history.sessions.map((session) => {
    if (session.id !== sessionId) return session;

    const knownIds = new Set(session.videos.map((video) => video.id));
    const additions = incoming.filter((video) => {
      if (knownIds.has(video.id)) return false;
      knownIds.add(video.id);
      return true;
    });

    addedCount = additions.length;
    if (additions.length === 0) return session;

    return {
      ...session,
      lastSeenAt: Math.max(...additions.map((video) => video.savedAt)),
      videos: [...session.videos, ...additions]
    };
  });

  return { history: { version: 1, sessions }, addedCount };
}

export function deleteSession(
  history: RecommendationHistory,
  sessionId: string
): RecommendationHistory {
  return {
    version: 1,
    sessions: history.sessions.filter((session) => session.id !== sessionId)
  };
}
