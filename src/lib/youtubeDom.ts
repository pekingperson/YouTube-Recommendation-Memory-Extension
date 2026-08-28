import type { SavedVideo } from './types';
import { getVideoIdentity } from './youtube';

export const CARD_SELECTORS = [
  'ytd-rich-item-renderer',
  'ytd-video-renderer',
  'ytd-grid-video-renderer',
  'yt-lockup-view-model'
].join(',');

const TITLE_SELECTORS = [
  'a#video-title-link',
  'a#video-title',
  'h3 a[href*="watch"]',
  'a.yt-lockup-metadata-view-model__title',
  'a[href*="/shorts/"][title]'
].join(',');

function cleanText(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function findText(card: Element, selectors: string): string {
  return cleanText(card.querySelector(selectors)?.textContent);
}

export function extractVideoCard(
  card: Element,
  position: number,
  savedAt = Date.now(),
  baseUrl = 'https://www.youtube.com/'
): SavedVideo | null {
  const titleAnchor = card.querySelector<HTMLAnchorElement>(TITLE_SELECTORS);
  const thumbnailAnchor = card.querySelector<HTMLAnchorElement>(
    'a#thumbnail[href*="watch"], a#thumbnail[href*="/shorts/"], a[href*="watch?v="], a[href*="/shorts/"]'
  );
  const anchor = titleAnchor ?? thumbnailAnchor;
  if (!anchor) return null;

  const identity = getVideoIdentity(anchor.getAttribute('href') ?? anchor.href, baseUrl);
  if (!identity) return null;

  const title = cleanText(
    titleAnchor?.getAttribute('title') ||
      titleAnchor?.textContent ||
      card.querySelector('[title]')?.getAttribute('title') ||
      anchor.getAttribute('aria-label')
  );
  if (!title) return null;

  return {
    id: identity.id,
    title,
    url: identity.url,
    thumbnailUrl: `https://i.ytimg.com/vi/${identity.id}/hqdefault.jpg`,
    channel: findText(
      card,
      'ytd-channel-name a, #channel-name a, a[href^="/@"], a[href*="/channel/"]'
    ),
    duration: findText(
      card,
      'ytd-thumbnail-overlay-time-status-renderer #text, .yt-badge-shape__text, .badge-shape-wiz__text'
    ),
    position,
    savedAt
  };
}
