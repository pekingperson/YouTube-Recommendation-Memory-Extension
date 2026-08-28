import type { ExtensionMessage, MessageResponse } from './types';

export async function sendMessage(message: ExtensionMessage): Promise<MessageResponse> {
  try {
    return (await chrome.runtime.sendMessage(message)) as MessageResponse;
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'The extension could not respond.'
    };
  }
}
