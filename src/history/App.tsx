import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  HardDrive,
  Pause,
  Play,
  Search,
  Trash2,
  X,
  Youtube
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { formatRelativeTime, formatSessionDate, pluralize } from '../lib/format';
import { sendMessage } from '../lib/runtime';
import { HISTORY_KEY, SETTINGS_KEY, readState } from '../lib/storage';
import type { ExtensionState, RecommendationSession } from '../lib/types';

export function App() {
  const [state, setState] = useState<ExtensionState | null>(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [toggleBusy, setToggleBusy] = useState(false);

  async function refresh() {
    try {
      setState(await readState());
      setError('');
    } catch {
      setError('Your saved history could not be read. Try reloading this page.');
    }
  }

  useEffect(() => {
    void refresh();
    const onChange = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (changes[HISTORY_KEY] || changes[SETTINGS_KEY]) void refresh();
    };
    chrome.storage.onChanged.addListener(onChange);
    return () => chrome.storage.onChanged.removeListener(onChange);
  }, []);

  useEffect(() => {
    if (!state || !window.location.hash) return;
    const targetId = decodeURIComponent(window.location.hash.slice(1));
    window.requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView({ block: 'start' });
    });
  }, [state]);

  const sessions = state?.history.sessions ?? [];
  const totalVideos = sessions.reduce((sum, session) => sum + session.videos.length, 0);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const enabled = state?.settings.captureEnabled ?? true;

  const visibleSessions = useMemo(() => {
    if (!normalizedQuery) return sessions;
    return sessions
      .map((session) => ({
        ...session,
        videos: session.videos.filter((video) =>
          `${video.title} ${video.channel}`.toLocaleLowerCase().includes(normalizedQuery)
        )
      }))
      .filter((session) => session.videos.length > 0);
  }, [sessions, normalizedQuery]);

  const visibleVideoCount = visibleSessions.reduce((sum, session) => sum + session.videos.length, 0);

  async function toggleCapture() {
    if (!state || toggleBusy) return;
    setToggleBusy(true);
    const response = await sendMessage({ type: 'SET_ENABLED', enabled: !enabled });
    if (!response.ok) setError(response.error ?? 'Could not update automatic saving.');
    await refresh();
    setToggleBusy(false);
  }

  async function removeSession(session: RecommendationSession) {
    const confirmed = window.confirm(
      `Delete the load from ${formatSessionDate(session.startedAt)} and its ${pluralize(session.videos.length, 'video')}?`
    );
    if (!confirmed) return;
    await sendMessage({ type: 'DELETE_SESSION', sessionId: session.id });
  }

  async function clearEverything() {
    if (!window.confirm('Delete all saved recommendation loads? This cannot be undone.')) return;
    await sendMessage({ type: 'CLEAR_HISTORY' });
  }

  function loadNumber(sessionId: string): number {
    return sessions.findIndex((session) => session.id === sessionId) + 1;
  }

  return (
    <div className="history-page">
      <header className="topbar">
        <div className="wordmark" aria-label="Recommendation Memory">
          <span className="brand-mark" aria-hidden="true"><i /></span>
          <span><small>Recommendation</small>Memory</span>
        </div>
        <div className="topbar-actions">
          <button
            className={`capture-control ${enabled ? 'is-on' : ''}`}
            onClick={toggleCapture}
            disabled={!state || toggleBusy}
            aria-pressed={enabled}
            aria-label={enabled ? 'Pause automatic saving' : 'Resume automatic saving'}
          >
            <span className="status-dot" />
            <span className="capture-label"><small>Auto-save</small><strong>{enabled ? 'On' : 'Paused'}</strong></span>
            {enabled ? <Pause size={15} /> : <Play size={15} />}
          </button>
          <a className="youtube-button" href="https://www.youtube.com/" target="_blank" rel="noreferrer">
            <Youtube size={18} /> <span>Open YouTube</span>
          </a>
        </div>
      </header>

      <main>
        <section className="page-heading">
          <div className="heading-copy">
            <p>Saved recommendations</p>
            <h1>Recommendation history</h1>
            <span>Browse videos from your last 20 YouTube homepage loads. Every Home tab and reload is captured separately; other YouTube pages are ignored.</span>
          </div>
          <div className="overview" aria-label="History summary">
            <div className="overview-stat"><strong>{sessions.length}</strong><span>loads saved</span></div>
            <div className="overview-stat"><strong>{totalVideos}</strong><span>videos saved</span></div>
            <div className="overview-memory">
              <div><span>Memory used</span><strong>{sessions.length} of 20</strong></div>
              <progress value={sessions.length} max="20">{sessions.length} of 20</progress>
              <p><HardDrive size={14} /> Stored only on this device</p>
            </div>
          </div>
        </section>

        <section className="toolbar" aria-label="History tools">
          <label className="search-box">
            <Search size={19} />
            <span className="sr-only">Search saved videos</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by video title or channel"
            />
            {query ? (
              <button onClick={() => setQuery('')} aria-label="Clear search"><X size={17} /></button>
            ) : null}
          </label>
          <p className="result-count" aria-live="polite">
            {normalizedQuery ? `${pluralize(visibleVideoCount, 'match')} across ${pluralize(visibleSessions.length, 'load')}` : `${pluralize(totalVideos, 'video')} across ${pluralize(sessions.length, 'load')}`}
          </p>
        </section>

        {error ? <div className="page-error" role="alert">{error}</div> : null}

        {!state ? (
          <div className="loading-state">Loading your recommendation history...</div>
        ) : visibleSessions.length > 0 ? (
          <div className="history-content">
            <aside className="load-sidebar">
              <div className="sidebar-heading"><h2>Homepage loads</h2><span>{sessions.length}/20</span></div>
              <nav aria-label="Jump to a homepage load">
                {visibleSessions.map((session) => {
                  const number = loadNumber(session.id);
                  return (
                    <a href={`#load-${session.id}`} key={session.id}>
                      <span className="nav-number">{String(number).padStart(2, '0')}</span>
                      <span className="nav-copy">
                        <strong>{number === 1 ? 'Latest load' : formatRelativeTime(session.startedAt)}</strong>
                        <small>{pluralize(session.videos.length, normalizedQuery ? 'match' : 'video')}</small>
                      </span>
                      <ArrowUpRight size={14} />
                    </a>
                  );
                })}
              </nav>
              <div className="sidebar-note"><CheckCircle2 size={15} /> The oldest load is removed automatically after load 20.</div>
              <button className="clear-button" onClick={clearEverything}><Trash2 size={16} /> Clear all history</button>
            </aside>

            <div className="session-list">
              {visibleSessions.map((session) => {
                const number = loadNumber(session.id);
                return (
                  <section className="session" id={`load-${session.id}`} key={session.id}>
                    <header className="session-header">
                      <div className="session-title">
                        <span>Load {String(number).padStart(2, '0')}</span>
                        <div>
                          <p>{number === 1 && !normalizedQuery ? 'Latest homepage load' : 'Homepage load'}</p>
                          <h2>{formatSessionDate(session.startedAt)}</h2>
                        </div>
                      </div>
                      <div className="session-actions">
                        <span>{pluralize(session.videos.length, normalizedQuery ? 'match' : 'video')}</span>
                        <button
                          className="delete-session"
                          onClick={() => removeSession(session)}
                          aria-label={`Delete load from ${formatSessionDate(session.startedAt)}`}
                          title="Delete this load"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </header>

                    {session.videos.length > 0 ? (
                      <div className="video-grid">
                        {session.videos.map((video) => (
                          <a className="video-card" href={video.url} target="_blank" rel="noreferrer" key={video.id}>
                            <div className="thumbnail-wrap">
                              <img src={video.thumbnailUrl} alt="" loading="lazy" />
                              {video.duration ? <span>{video.duration}</span> : null}
                              <i><ArrowUpRight size={18} /></i>
                            </div>
                            <div className="video-copy">
                              <h3>{video.title}</h3>
                              <p>{video.channel || 'YouTube'}</p>
                            </div>
                          </a>
                        ))}
                      </div>
                    ) : (
                      <div className="empty-load"><Clock3 size={18} /> No video cards had loaded before this page was left.</div>
                    )}
                  </section>
                );
              })}
            </div>
          </div>
        ) : sessions.length > 0 ? (
          <div className="empty-state"><Search size={30} /><h2>No matching videos</h2><p>Try a different title or channel name.</p><button className="btn-primary" onClick={() => setQuery('')}>Clear search</button></div>
        ) : (
          <div className="empty-state">
            <Youtube size={34} />
            <h2>Your history is ready to start.</h2>
            <p>Open the YouTube homepage in any tab and scroll. Recommendation Memory will save each video card automatically.</p>
            <a className="btn-primary" href="https://www.youtube.com/" target="_blank" rel="noreferrer">Open YouTube <ArrowUpRight size={16} /></a>
          </div>
        )}
      </main>
    </div>
  );
}
