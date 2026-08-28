// @vitest-environment happy-dom

import { beforeEach, describe, expect, it } from 'vitest';
import { extractVideoCard } from './youtubeDom';

describe('YouTube homepage card extraction', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('extracts a classic rich-grid video card', () => {
    document.body.innerHTML = `
      <ytd-rich-item-renderer>
        <a id="thumbnail" href="/watch?v=classic_ID1"></a>
        <a id="video-title-link" href="/watch?v=classic_ID1" title="A classic recommendation">
          A classic recommendation
        </a>
        <ytd-channel-name><a href="/@workshop">Example Workshop</a></ytd-channel-name>
        <ytd-thumbnail-overlay-time-status-renderer><span id="text">12:42</span></ytd-thumbnail-overlay-time-status-renderer>
      </ytd-rich-item-renderer>`;

    expect(extractVideoCard(document.body.firstElementChild!, 3, 100)).toEqual({
      id: 'classic_ID1',
      title: 'A classic recommendation',
      url: 'https://www.youtube.com/watch?v=classic_ID1',
      thumbnailUrl: 'https://i.ytimg.com/vi/classic_ID1/hqdefault.jpg',
      channel: 'Example Workshop',
      duration: '12:42',
      position: 3,
      savedAt: 100
    });
  });

  it('extracts a newer lockup card', () => {
    document.body.innerHTML = `
      <yt-lockup-view-model>
        <a class="yt-lockup-metadata-view-model__title" href="/watch?v=lockup_ID2">
          New renderer recommendation
        </a>
        <a href="/@channel-two">Channel Two</a>
        <span class="yt-badge-shape__text">8:15</span>
      </yt-lockup-view-model>`;

    const result = extractVideoCard(document.body.firstElementChild!, 0, 200);
    expect(result?.id).toBe('lockup_ID2');
    expect(result?.title).toBe('New renderer recommendation');
    expect(result?.channel).toBe('Channel Two');
    expect(result?.duration).toBe('8:15');
  });

  it('ignores non-video navigation cards', () => {
    document.body.innerHTML = '<ytd-rich-item-renderer><a href="/playlist?list=abc">Playlist</a></ytd-rich-item-renderer>';
    expect(extractVideoCard(document.body.firstElementChild!, 0)).toBeNull();
  });
});
