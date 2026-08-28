import { createEmptyHistory, normalizeHistory } from './historyModel';
import type {
  ExtensionSettings,
  ExtensionState,
  RecommendationHistory
} from './types';

export const HISTORY_KEY = 'recommendationHistoryV1';
export const SETTINGS_KEY = 'recommendationSettingsV1';

export const DEFAULT_SETTINGS: ExtensionSettings = { captureEnabled: true };

export async function readHistory(): Promise<RecommendationHistory> {
  const result = await chrome.storage.local.get(HISTORY_KEY);
  return normalizeHistory(result[HISTORY_KEY]);
}

export async function writeHistory(history: RecommendationHistory): Promise<void> {
  await chrome.storage.local.set({ [HISTORY_KEY]: history });
}

export async function readSettings(): Promise<ExtensionSettings> {
  const result = await chrome.storage.local.get(SETTINGS_KEY);
  const value = result[SETTINGS_KEY] as Partial<ExtensionSettings> | undefined;
  return {
    captureEnabled:
      typeof value?.captureEnabled === 'boolean'
        ? value.captureEnabled
        : DEFAULT_SETTINGS.captureEnabled
  };
}

export async function writeSettings(settings: ExtensionSettings): Promise<void> {
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
}

export async function readState(): Promise<ExtensionState> {
  const [history, settings] = await Promise.all([readHistory(), readSettings()]);
  return { history, settings };
}

export async function clearHistory(): Promise<void> {
  await writeHistory(createEmptyHistory());
}
