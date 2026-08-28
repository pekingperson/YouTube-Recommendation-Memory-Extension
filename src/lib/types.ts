export interface SavedVideo {
  id: string;
  title: string;
  url: string;
  thumbnailUrl: string;
  channel: string;
  duration: string;
  position: number;
  savedAt: number;
}

export interface RecommendationSession {
  id: string;
  startedAt: number;
  lastSeenAt: number;
  videos: SavedVideo[];
}

export interface RecommendationHistory {
  version: 1;
  sessions: RecommendationSession[];
}

export interface ExtensionSettings {
  captureEnabled: boolean;
}

export type ExtensionMessage =
  | { type: 'START_SESSION'; sessionId: string; startedAt: number }
  | { type: 'SAVE_VIDEOS'; sessionId: string; videos: SavedVideo[] }
  | { type: 'GET_STATE' }
  | { type: 'SET_ENABLED'; enabled: boolean }
  | { type: 'DELETE_SESSION'; sessionId: string }
  | { type: 'CLEAR_HISTORY' };

export interface ExtensionState {
  history: RecommendationHistory;
  settings: ExtensionSettings;
}

export interface MessageResponse {
  ok: boolean;
  enabled?: boolean;
  addedCount?: number;
  state?: ExtensionState;
  error?: string;
}
