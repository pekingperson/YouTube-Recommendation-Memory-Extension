export interface VideoIdentity {
  id: string;
  url: string;
}

export function isYouTubeHomepage(url: string | URL): boolean {
  try {
    const parsed = typeof url === 'string' ? new URL(url) : url;
    return parsed.hostname === 'www.youtube.com' && parsed.pathname === '/';
  } catch {
    return false;
  }
}

export function getVideoIdentity(
  href: string,
  baseUrl = 'https://www.youtube.com/'
): VideoIdentity | null {
  try {
    const parsed = new URL(href, baseUrl);
    const watchId = parsed.pathname === '/watch' ? parsed.searchParams.get('v') : null;
    const shortsMatch = parsed.pathname.match(/^\/shorts\/([A-Za-z0-9_-]{6,})/);
    const id = watchId ?? shortsMatch?.[1];
    if (!id) return null;

    return {
      id,
      url: shortsMatch
        ? `https://www.youtube.com/shorts/${id}`
        : `https://www.youtube.com/watch?v=${id}`
    };
  } catch {
    return null;
  }
}
