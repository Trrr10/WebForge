import { useState, useEffect, useRef } from 'react'
import LibraryMap from '../components/LibraryMap'
import CheckInModal from '../components/CheckInModal'
import SessionControls from '../components/SessionControls'
import { useRealtimeDesks } from '../hooks/useRealtimeDesks'

function FlipNumber({ value, color }) {
  const [display, setDisplay] = useState(value)
  const [flipping, setFlipping] = useState(false)
  const prev = useRef(value)

  useEffect(() => {
    if (prev.current === value) return
    setFlipping(true)
    const t = setTimeout(() => { setDisplay(value); setFlipping(false); prev.current = value }, 180)
    return () => clearTimeout(t)
  }, [value])

  return (
    <span
      className="flip-num"
      style={{
        color,
        opacity: flipping ? 0 : 1,
        transform: flipping ? 'translateY(-6px)' : 'translateY(0)',
        transition: 'opacity 0.18s, transform 0.18s',
        display: 'inline-block',
      }}
    >
      {display}
    </span>
  )
}

function HelpDrawer({ open, onClose }) {
  if (!open) return null
  return (
    <div className="help-overlay" onClick={onClose}>
      <div className="help-drawer" onClick={e => e.stopPropagation()}>
        <div className="help-header">
          <span className="help-title">How DeskGuard works</span>
          <button className="help-close" onClick={onClose}>✕</button>
        </div>
        <ol className="help-steps">
          <li><strong>Find a green seat</strong> on the floor plan and tap it.</li>
          <li>Enter your <strong>roll number</strong> to check in. The seat turns red.</li>
          <li>Need a break? Hit <strong>"Step away"</strong> — you get 20 minutes before the seat is released.</li>
          <li>Your session lasts <strong>2 hours</strong>. You'll get a prompt to confirm you're still there at 1h 50m.</li>
          <li>When you leave, press <strong>Check out</strong> so someone else can use it.</li>
        </ol>
        <p className="help-footer">Yellow seats are temporarily away. Red seats are occupied. Orange seats were abandoned and can be taken.</p>
      </div>
    </div>
  )
}

const STATUS_CONFIG = {
  free:      { label: 'Free',      color: '#6FBF73' },
  occupied:  { label: 'Occupied',  color: '#E0675C' },
  away:      { label: 'Away',      color: '#E8C26B' },
  abandoned: { label: 'Abandoned', color: '#E2935B' },
}

export default function HomePage() {
  const { desks, loading, error, stats } = useRealtimeDesks()
  const [selectedDesk, setSelectedDesk] = useState(null)
  const [session, setSession] = useState(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [banner, setBanner] = useState(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('deskguard_session')
      if (raw) {
        const s = JSON.parse(raw)
        if (new Date(s.expiresAt) > new Date()) setSession(s)
        else localStorage.removeItem('deskguard_session')
      }
    } catch { localStorage.removeItem('deskguard_session') }
  }, [])

  useEffect(() => {
    if (!session || !desks.length) return
    const live = desks.find(d => d.id === session.deskId)
    if (live && live.status === 'free') {
      setSession(null)
      localStorage.removeItem('deskguard_session')
      showBanner('Your seat was released — it\'s available again.', 'warn')
    }
  }, [desks, session])

  function showBanner(msg, type = 'info') {
    setBanner({ msg, type })
    setTimeout(() => setBanner(null), 4000)
  }

  function handleDeskClick(desk) {
    if (session) { showBanner('Check out of your current seat first.', 'warn'); return }
    if (desk.status === 'free' || desk.status === 'abandoned') setSelectedDesk(desk)
  }

  function handleCheckInSuccess(newSession) {
    setSession(newSession)
    localStorage.setItem('deskguard_session', JSON.stringify(newSession))
    setSelectedDesk(null)
    showBanner(`Checked in to desk ${newSession.deskId}. Your seat is reserved for 2 hours.`, 'ok')
  }

  function handleCheckout() {
    setSession(null)
    localStorage.removeItem('deskguard_session')
    showBanner('Checked out. Thanks for freeing your seat!', 'ok')
  }

  const freeCount = stats?.free ?? 0
  const total = (stats?.free ?? 0) + (stats?.occupied ?? 0) + (stats?.away ?? 0) + (stats?.abandoned ?? 0)

  return (
    <>
      <style>{PAGE_CSS}</style>
      <div className="hg-root">

        {banner && (
          <div className={`hg-banner hg-banner-${banner.type}`} role="status">
            {banner.msg}
          </div>
        )}

        <header className="hg-header">
          <div className="hg-header-inner">
            <div className="hg-wordmark">
              <span className="hg-crest">DG</span>
              <div className="hg-wordmark-text">
                <span className="hg-name">DeskGuard</span>
                <span className="hg-tagline">MUJ Central Library</span>
              </div>
            </div>

            <div className="hg-ticker" aria-label="Live seat availability">
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <div className="hg-tick-item" key={key}>
                  <FlipNumber value={stats?.[key] ?? 0} color={cfg.color} />
                  <span className="hg-tick-label">{cfg.label}</span>
                </div>
              ))}
              <div className="hg-tick-divider" />
              <div className="hg-tick-live">
                <span className="hg-live-dot" />
                LIVE
              </div>
            </div>

            <div className="hg-header-actions">
              <button className="hg-help-btn" onClick={() => setHelpOpen(true)} aria-label="How it works">?</button>
              <a href="/admin" className="hg-admin-link">Librarian →</a>
            </div>
          </div>
        </header>

        {session && (
          <div className="hg-session-strip">
            <SessionControls session={session} onCheckout={handleCheckout} />
          </div>
        )}

        <main className="hg-main">
          <div className="hg-avail-bar">
            <div className="hg-avail-left">
              <span
                className="hg-avail-num"
                style={{ color: freeCount > 5 ? '#6FBF73' : freeCount > 0 ? '#E8C26B' : '#E0675C' }}
              >
                {freeCount}
              </span>
              <span className="hg-avail-of">of {total} seats available</span>
              {freeCount === 0 && <span className="hg-avail-badge full">Library full</span>}
              {freeCount > 0 && freeCount <= 5 && <span className="hg-avail-badge low">Filling up</span>}
            </div>

            <div className="hg-legend">
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <span className="hg-legend-item" key={key}>
                  <span className="hg-legend-dot" style={{ background: cfg.color }} />
                  {cfg.label}
                </span>
              ))}
            </div>
          </div>

          <div className="hg-map-card">
            {loading && (
              <div className="hg-map-state">
                <div className="hg-spinner" />
                <p>Loading floor plan…</p>
              </div>
            )}
            {error && (
              <div className="hg-map-state hg-map-error">
                <span>⚠</span> Could not load seats: {error}
              </div>
            )}
            {!loading && !error && (
              <LibraryMap desks={desks} onDeskClick={handleDeskClick} />
            )}
          </div>
        </main>

        {selectedDesk && (
          <CheckInModal
            desk={selectedDesk}
            onClose={() => setSelectedDesk(null)}
            onSuccess={handleCheckInSuccess}
          />
        )}

        <HelpDrawer open={helpOpen} onClose={() => setHelpOpen(false)} />
      </div>
    </>
  )
}

const PAGE_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .hg-root {
    min-height: 100vh;
    background: #152019;
    color: #F3EFE6;
    font-family: 'Inter', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    display: flex;
    flex-direction: column;
  }

  /* ── Banner ── */
  .hg-banner {
    position: fixed; top: 0; left: 0; right: 0; z-index: 200;
    padding: 0.6rem 1.5rem;
    font-size: 0.83rem; font-weight: 600;
    text-align: center;
    animation: bannerIn 0.2s ease;
  }
  @keyframes bannerIn {
    from { opacity: 0; transform: translateY(-100%); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .hg-banner-ok   { background: #14532d; color: #86efac; border-bottom: 1px solid #166534; }
  .hg-banner-warn { background: #431a00; color: #fcd34d; border-bottom: 1px solid #78350f; }

  /* ── Header ── */
  .hg-header {
    border-bottom: 1px solid rgba(212,162,78,0.15);
    background: rgba(21,32,25,0.97);
    backdrop-filter: blur(12px);
    position: sticky; top: 0; z-index: 100;
  }
  .hg-header-inner {
    max-width: 1500px; margin: 0 auto;
    padding: 0 1.5rem; height: 60px;
    display: flex; align-items: center; gap: 1rem;
  }

  /* Wordmark */
  .hg-wordmark { display: flex; align-items: center; gap: 0.65rem; flex-shrink: 0; }
  .hg-crest {
    width: 36px; height: 36px;
    background: #3F2817;
    border: 1px solid rgba(212,162,78,0.4);
    border-radius: 8px;
    display: grid; place-items: center;
    font-family: 'Playfair Display', serif;
    font-size: 0.9rem; font-weight: 700;
    color: #D4A24E; flex-shrink: 0;
  }
  .hg-wordmark-text { display: flex; flex-direction: column; line-height: 1.1; }
  .hg-name {
    font-family: 'Playfair Display', serif;
    font-size: 1rem; font-weight: 700; color: #F3EFE6;
  }
  .hg-tagline {
    font-size: 0.62rem; letter-spacing: 0.12em;
    text-transform: uppercase; color: #9CB3A6;
  }

  /* Live ticker */
  .hg-ticker {
    flex: 1;
    display: flex; align-items: center; justify-content: center;
    gap: 0;
    background: rgba(31,47,39,0.9);
    border: 1px solid rgba(212,162,78,0.12);
    border-radius: 10px;
    padding: 0 1.25rem; height: 40px;
    overflow: hidden;
  }
  .hg-tick-item {
    display: flex; flex-direction: column; align-items: center;
    padding: 0 1rem;
    border-right: 1px solid rgba(255,255,255,0.06);
    min-width: 52px;
  }
  .flip-num {
    font-family: 'JetBrains Mono', monospace;
    font-size: 1.05rem; font-weight: 700; line-height: 1;
  }
  .hg-tick-label {
    font-size: 0.55rem; letter-spacing: 0.08em;
    text-transform: uppercase; color: #4b5e52; margin-top: 1px;
  }
  .hg-tick-divider {
    width: 1px; height: 24px;
    background: rgba(212,162,78,0.2);
    margin: 0 0.75rem; flex-shrink: 0;
  }
  .hg-tick-live {
    display: flex; align-items: center; gap: 0.35rem;
    font-size: 0.6rem; font-weight: 700;
    letter-spacing: 0.1em; color: #6FBF73; flex-shrink: 0;
  }
  .hg-live-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: #6FBF73;
    animation: livePulse 2s ease-in-out infinite; flex-shrink: 0;
  }
  @keyframes livePulse {
    0%,100% { opacity: 1; box-shadow: 0 0 0 0 rgba(111,191,115,0.4); }
    50%      { opacity: 0.6; box-shadow: 0 0 0 4px rgba(111,191,115,0); }
  }

  /* Header actions */
  .hg-header-actions { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }
  .hg-help-btn {
    width: 32px; height: 32px; border-radius: 50%;
    background: rgba(156,179,166,0.1);
    border: 1px solid rgba(156,179,166,0.2);
    color: #9CB3A6; font-size: 0.85rem; font-weight: 700;
    cursor: pointer; display: grid; place-items: center;
    transition: all 0.15s;
    font-family: 'JetBrains Mono', monospace;
  }
  .hg-help-btn:hover { background: rgba(156,179,166,0.18); color: #F3EFE6; }
  .hg-admin-link {
    padding: 0.35rem 0.9rem; border-radius: 6px;
    border: 1px solid rgba(212,162,78,0.3);
    color: #D4A24E; font-size: 0.78rem; font-weight: 600;
    text-decoration: none; transition: all 0.15s; white-space: nowrap;
  }
  .hg-admin-link:hover { background: rgba(212,162,78,0.1); }

  /* ── Session strip ── */
  .hg-session-strip {
    border-bottom: 1px solid rgba(212,162,78,0.15);
    background: #1F2F27;
    padding: 0 1.5rem;
  }

  /* ── Main ── */
  .hg-main {
    flex: 1; max-width: 1500px; width: 100%;
    margin: 0 auto; padding: 1.25rem 1.5rem 2rem;
    display: flex; flex-direction: column; gap: 1rem;
  }

  /* ── Availability bar ── */
  .hg-avail-bar {
    display: flex; align-items: center;
    justify-content: space-between; flex-wrap: wrap; gap: 0.75rem;
    padding: 0.85rem 1.25rem;
    background: #1F2F27;
    border: 1px solid rgba(212,162,78,0.1);
    border-radius: 12px;
  }
  .hg-avail-left { display: flex; align-items: center; gap: 0.6rem; }
  .hg-avail-num {
    font-family: 'JetBrains Mono', monospace;
    font-size: 1.5rem; font-weight: 700; line-height: 1;
    transition: color 0.4s;
  }
  .hg-avail-of { font-size: 0.83rem; color: #6b7e70; }
  .hg-avail-badge {
    font-size: 0.65rem; font-weight: 700;
    letter-spacing: 0.08em; text-transform: uppercase;
    border-radius: 99px; padding: 0.2rem 0.6rem;
  }
  .hg-avail-badge.full { background: rgba(224,103,92,0.15); color: #E0675C; border: 1px solid rgba(224,103,92,0.3); }
  .hg-avail-badge.low  { background: rgba(232,194,107,0.12); color: #E8C26B; border: 1px solid rgba(232,194,107,0.25); }

  .hg-legend { display: flex; gap: 1rem; flex-wrap: wrap; }
  .hg-legend-item {
    display: flex; align-items: center; gap: 0.35rem;
    font-size: 0.75rem; color: #6b7e70;
  }
  .hg-legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

  /* ── Map card ── */
  .hg-map-card {
    flex: 1;
    background: #1F2F27;
    border: 1px solid rgba(212,162,78,0.12);
    border-radius: 16px;
    overflow: hidden; padding: 1rem;
    min-height: 480px;
    display: flex; flex-direction: column;
  }
  .hg-map-state {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 0.75rem; color: #4b5e52; font-size: 0.88rem;
  }
  .hg-map-error { color: #E0675C; }
  .hg-spinner {
    width: 28px; height: 28px;
    border: 2px solid rgba(212,162,78,0.2);
    border-top-color: #D4A24E;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Help drawer ── */
  .help-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
    z-index: 300;
    display: flex; align-items: flex-end; justify-content: center;
    padding: 1rem;
  }
  .help-drawer {
    background: #28392F;
    border: 1px solid rgba(212,162,78,0.2);
    border-radius: 16px; padding: 1.5rem;
    width: 100%; max-width: 520px;
    animation: drawerUp 0.22s ease;
  }
  @keyframes drawerUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .help-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 1rem;
  }
  .help-title { font-size: 1rem; font-weight: 700; color: #D4A24E; }
  .help-close {
    background: none; border: none;
    color: #6b7e70; font-size: 1rem; cursor: pointer; padding: 0.25rem;
  }
  .help-close:hover { color: #F3EFE6; }
  .help-steps {
    display: flex; flex-direction: column; gap: 0.6rem;
    padding-left: 1.25rem;
  }
  .help-steps li { font-size: 0.85rem; color: #c9d4c2; line-height: 1.5; }
  .help-steps li strong { color: #F3EFE6; }
  .help-footer {
    margin-top: 1rem; font-size: 0.75rem; color: #4b5e52;
    border-top: 1px solid rgba(255,255,255,0.06);
    padding-top: 0.75rem; line-height: 1.5;
  }

  /* ── Responsive ── */
  @media (max-width: 768px) {
    .hg-ticker { display: none; }
    .hg-header-inner { gap: 0.5rem; }
    .hg-main { padding: 1rem; }
    .hg-avail-bar { padding: 0.7rem 1rem; }
    .hg-legend { display: none; }
  }
  @media (max-width: 480px) {
    .hg-wordmark-text .hg-tagline { display: none; }
    .hg-avail-num { font-size: 1.25rem; }
  }
  @media (prefers-reduced-motion: reduce) {
    .hg-live-dot, .hg-banner, .help-drawer, .hg-spinner { animation: none; }
  }
`
