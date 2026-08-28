import { describe, expect, it } from 'vitest';
import { getVideoIdentity, isYouTubeHomepage } from './youtube';

describe('YouTube link parsing', () => {
  it('canonicalizes watch links and removes unrelated query parameters', () => {
    expect(getVideoIdentity('/watch?v=abc123XYZ_0&list=queue')).toEqual({
      id: 'abc123XYZ_0',
      url: 'https://www.youtube.com/watch?v=abc123XYZ_0'
    });
  });

  it('supports Shorts recommendations', () => {
    expect(getVideoIdentity('https://www.youtube.com/shorts/short_ID9?feature=share')).toEqual({
      id: 'short_ID9',
      url: 'https://www.youtube.com/shorts/short_ID9'
    });
  });

  it('ignores non-video links', () => {
    expect(getVideoIdentity('/playlist?list=abc')).toBeNull();
  });
});

describe('YouTube capture routing', () => {
  it('captures the YouTube homepage', () => {
    expect(isYouTubeHomepage('https://www.youtube.com/')).toBe(true);
  });

  it('does not capture the Subscriptions page', () => {
    expect(isYouTubeHomepage('https://www.youtube.com/feed/subscriptions')).toBe(false);
  });

  it('does not capture watch or Shorts pages', () => {
    expect(isYouTubeHomepage('https://www.youtube.com/watch?v=abc123XYZ_0')).toBe(false);
    expect(isYouTubeHomepage('https://www.youtube.com/shorts/short_ID9')).toBe(false);
  });
});
