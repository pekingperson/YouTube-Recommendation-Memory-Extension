import {
  ArrowRight,
  ArrowUpRight,
  Clock3,
  HardDrive,
  History,
  Radio,
  Youtube
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatRelativeTime, pluralize } from '../lib/format';
import { sendMessage } from '../lib/runtime';
import { HISTORY_KEY, SETTINGS_KEY, readState } from '../lib/storage';
import type { ExtensionState } from '../lib/types';

export function App() {
  const [state, setState] = useState<ExtensionState | null>(null);
  const [error, setError] = useState('');
  const [toggleBusy, setToggleBusy] = useState(false);

  async function refresh() {
    try {
      setState(await readState());
      setError('');
    } catch {
      setError('Could not read your saved recommendations.');
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

  async function toggleCapture() {
    if (!state || toggleBusy) return;
    setToggleBusy(true);
    const enabled = !state.settings.captureEnabled;
    const response = await sendMessage({ type: 'SET_ENABLED', enabled });
    if (!response.ok) setError(response.error ?? 'Could not update automatic saving.');
    await refresh();
    setToggleBusy(false);
  }

  async function openHistory(sessionId?: string) {
    const hash = sessionId ? `#load-${encodeURIComponent(sessionId)}` : '';
    await chrome.tabs.create({ url: chrome.runtime.getURL(`history.html${hash}`) });
  }

  const sessions = state?.history.sessions ?? [];
  const latest = sessions[0];
  const totalVideos = sessions.reduce((sum, session) => sum + session.videos.length, 0);
  const recentVideos = latest?.videos.slice(-3).reverse() ?? [];
  const enabled = state?.settings.captureEnabled ?? true;
  const loadPercentage = Math.min((sessions.length / 20) * 100, 100);

  return (
    <main className="popup-shell">
      <header className="brand-row">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true"><span /></div>
          <div>
            <p>Recommendation</p>
            <h1>Memory</h1>
          </div>
        </div>
        <a
          className="header-link"
          href="https://www.youtube.com/"
          target="_blank"
          rel="noreferrer"
          aria-label="Open YouTube homepage"
          title="Open YouTube"
        >
          <Youtube size={19} />
        </a>
      </header>

      <section className={`capture-card ${enabled ? 'is-on' : 'is-paused'}`} aria-live="polite">
        <div className="capture-icon" aria-hidden="true"><Radio size={19} /></div>
        <div className="capture-copy">
          <span>Automatic saving</span>
          <strong>{enabled ? 'On for YouTube Home only' : 'Paused'}</strong>
        </div>
        <button
          className={`capture-toggle ${enabled ? 'is-on' : ''}`}
          onClick={toggleCapture}
          aria-pressed={enabled}
          aria-label={enabled ? 'Pause automatic saving' : 'Resume automatic saving'}
          disabled={!state || toggleBusy}
        >
          <i />
        </button>
      </section>

      {error ? <p className="error-message" role="alert">{error}</p> : null}

      <section className="snapshot" aria-label="Saved recommendation summary">
        <button
          className="latest-count summary-link"
          onClick={() => void openHistory(latest?.id)}
          disabled={!latest}
          aria-label={latest ? 'Open the latest saved homepage load' : 'No homepage loads saved yet'}
        >
          <span>Latest homepage load</span>
          <div><strong>{latest?.videos.length ?? 0}</strong><small>videos</small></div>
          <p>{latest ? <><Clock3 size={13} /> Captured {formatRelativeTime(latest.startedAt)}</> : 'Waiting for your first visit'}</p>
        </button>
        <button className="memory-meter summary-link" onClick={() => void openHistory()} aria-label="Open all saved loads">
          <div><span>Load memory</span><strong>{sessions.length} / 20</strong></div>
          <div className="meter-track" aria-hidden="true"><i style={{ width: `${loadPercentage}%` }} /></div>
          <p>{pluralize(totalVideos, 'video')} saved in total</p>
        </button>
      </section>

      <section className="latest-section">
        <div className="section-heading">
          <h2>Recently saved</h2>
          {sessions.length > 0 ? (
            <button onClick={() => void openHistory()}>See all <ArrowRight size={14} /></button>
          ) : null}
        </div>

        {recentVideos.length > 0 ? (
          <div className="mini-list">
            {recentVideos.map((video) => (
              <a className="mini-video" href={video.url} target="_blank" rel="noreferrer" key={video.id}>
                <div className="mini-thumbnail">
                  <img src={video.thumbnailUrl} alt="" />
                  {video.duration ? <span>{video.duration}</span> : null}
                </div>
                <span className="mini-copy">
                  <strong>{video.title}</strong>
                  <small>{video.channel || 'YouTube'}</small>
                </span>
                <ArrowUpRight size={16} aria-hidden="true" />
              </a>
            ))}
          </div>
        ) : (
          <div className="empty-mini">
            <Youtube size={24} />
            <strong>Nothing saved yet</strong>
            <p>Open YouTube Home in any tab and scroll. Videos will appear here automatically.</p>
          </div>
        )}
      </section>

      <button className="btn-primary primary-button" onClick={() => void openHistory()}>
        <History size={18} /> Browse saved recommendations
        <ArrowRight size={17} />
      </button>

      <p className="privacy-note"><HardDrive size={14} /> Available from any tab - saved only on this device</p>
    </main>
  );
}
