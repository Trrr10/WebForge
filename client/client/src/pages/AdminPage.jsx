import { useState, useEffect, useCallback } from 'react'

const API = import.meta.env.VITE_API_URL || ''

function timeAgo(isoString) {
  if (!isoString) return '—'
  const diff = Math.floor((Date.now() - new Date(isoString)) / 60000)
  if (diff < 1) return 'just now'
  if (diff === 1) return '1 min ago'
  if (diff < 60) return `${diff} min ago`
  return `${Math.floor(diff / 60)}h ${diff % 60}m ago`
}

function timeLeft(isoString) {
  if (!isoString) return '—'
  const diff = Math.floor((new Date(isoString) - Date.now()) / 60000)
  if (diff <= 0) return 'expired'
  if (diff < 60) return `${diff}m left`
  return `${Math.floor(diff / 60)}h ${diff % 60}m`
}

const STATUS_META = {
  free:      { color: '#22c55e', bg: '#052e16', label: 'Free' },
  occupied:  { color: '#60a5fa', bg: '#172554', label: 'Occupied' },
  away:      { color: '#f59e0b', bg: '#431a00', label: 'Away' },
  abandoned: { color: '#fb923c', bg: '#431407', label: 'Abandoned' },
}

function StatCard({ label, value, color, sublabel }) {
  return (
    <div className="stat-card">
      <div className="stat-value" style={{ color }}>{value}</div>
      <div className="stat-label">{label}</div>
      {sublabel && <div className="stat-sub">{sublabel}</div>}
    </div>
  )
}

function StatusPip({ status }) {
  const m = STATUS_META[status] || STATUS_META.free
  return (
    <span className="status-pip" style={{ '--pip-color': m.color, '--pip-bg': m.bg }}>
      <span className={`pip-dot${status === 'abandoned' ? ' pip-pulse' : ''}`} />
      {m.label}
    </span>
  )
}

export default function AdminPage() {
  const [token, setToken]           = useState('')
  const [authed, setAuthed]         = useState(false)
  const [desks, setDesks]           = useState([])
  const [sessions, setSessions]     = useState([])
  const [stats, setStats]           = useState(null)
  const [loading, setLoading]       = useState(false)
  const [resetingId, setResetingId] = useState(null)
  const [error, setError]           = useState('')
  const [activeTab, setActiveTab]   = useState('desks')
  const [search, setSearch]         = useState('')
  const [filter, setFilter]         = useState('all')
  const [lastRefresh, setLastRefresh] = useState(null)
  const [successMsg, setSuccessMsg]   = useState('')

  const headers = { 'Content-Type': 'application/json', 'x-admin-token': token }

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [dRes, sRes, stRes] = await Promise.all([
        fetch(`${API}/api/admin/desks`, { headers }),
        fetch(`${API}/api/admin/sessions`, { headers }),
        fetch(`${API}/api/admin/stats`, { headers }),
      ])
      if (!dRes.ok) throw new Error('Invalid token. Try again.')
      setDesks(await dRes.json())
      setSessions(await sRes.json())
      setStats(await stRes.json())
      setAuthed(true)
      setLastRefresh(new Date())
    } catch (e) {
      setError(e.message)
      setAuthed(false)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (!authed) return
    const id = setInterval(fetchAll, 60000)
    return () => clearInterval(id)
  }, [authed, fetchAll])

  async function resetDesk(id) {
    setResetingId(id)
    await fetch(`${API}/api/admin/reset/${id}`, { method: 'POST', headers })
    await fetchAll()
    setResetingId(null)
    flash('Desk freed.')
  }

  async function resetAll() {
    if (!confirm('Free all abandoned desks?')) return
    setLoading(true)
    await fetch(`${API}/api/admin/reset-all`, { method: 'POST', headers })
    await fetchAll()
    flash('All abandoned desks cleared.')
  }

  function flash(msg) {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(''), 3000)
  }

  const filteredDesks = desks
    .filter(d => filter === 'all' || d.status === filter)
    .filter(d =>
      !search ||
      d.id.toLowerCase().includes(search.toLowerCase()) ||
      (d.student_id || '').toLowerCase().includes(search.toLowerCase())
    )

  const abandonedCount = desks.filter(d => d.status === 'abandoned').length

  /* ── LOGIN ─────────────────────────────────────────────── */
  if (!authed) {
    return (
      <>
        <style>{ADM_CSS}</style>
        <div className="adm-root">
          <div className="adm-login">
            <div className="adm-login-brand">
              <span className="adm-monogram">DG</span>
              <span className="adm-brand-text">DeskGuard</span>
            </div>
            <h1 className="adm-login-title">Librarian Access</h1>
            <p className="adm-login-hint">Enter your admin token to open the control panel.</p>
            <div className="adm-field">
              <label className="adm-label" htmlFor="tok">Admin token</label>
              <input
                id="tok"
                className="adm-input"
                type="password"
                placeholder="••••••••••••"
                value={token}
                onChange={e => setToken(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchAll()}
                autoFocus
              />
            </div>
            {error && <div className="adm-error-bar" role="alert"><span>⚠</span> {error}</div>}
            <button className="adm-btn-primary" onClick={fetchAll} disabled={loading || !token}>
              {loading ? 'Verifying…' : 'Enter dashboard →'}
            </button>
            <a href="/" className="adm-back-link">← Back to library map</a>
          </div>
        </div>
      </>
    )
  }

  /* ── DASHBOARD ─────────────────────────────────────────── */
  return (
    <>
      <style>{ADM_CSS}</style>
      <div className="adm-root adm-dashboard">

        {successMsg && <div className="adm-toast" role="status">✓ {successMsg}</div>}

        <header className="adm-header">
          <div className="adm-header-left">
            <span className="adm-monogram sm">DG</span>
            <div>
              <h1 className="adm-page-title">Control Panel</h1>
              <p className="adm-page-sub">
                {lastRefresh ? `Updated ${timeAgo(lastRefresh)}` : 'Live'}
                <span className="adm-live-dot" title="Auto-refreshes every 60s" />
              </p>
            </div>
          </div>
          <div className="adm-header-right">
            <button className="adm-btn-ghost" onClick={fetchAll} disabled={loading}>
              {loading ? '…' : '↻ Refresh'}
            </button>
            <a href="/" className="adm-btn-ghost">← Map</a>
          </div>
        </header>

        <div className="adm-body">

          {stats && (
            <div className="adm-stats-row">
              <StatCard label="Free"      value={stats.free}      color="#22c55e" sublabel={`of ${stats.total} seats`} />
              <StatCard label="Occupied"  value={stats.occupied}  color="#60a5fa" />
              <StatCard label="Away"      value={stats.away}      color="#f59e0b" sublabel="paused ≤20 min" />
              <StatCard label="Abandoned" value={stats.abandoned} color="#fb923c" sublabel={stats.abandoned > 0 ? 'needs action' : 'all clear'} />
            </div>
          )}

          {abandonedCount > 0 && (
            <div className="adm-alert">
              <div className="adm-alert-left">
                <span className="adm-alert-icon">⚠</span>
                <div>
                  <p className="adm-alert-title">
                    {abandonedCount} seat{abandonedCount > 1 ? 's' : ''} abandoned
                  </p>
                  <p className="adm-alert-sub">
                    No student response for over 2 hours. These can be freed immediately.
                  </p>
                </div>
              </div>
              <button className="adm-btn-amber" onClick={resetAll} disabled={loading}>
                Clear all →
              </button>
            </div>
          )}

          <div className="adm-toolbar">
            <div className="adm-tabs">
              {['desks', 'sessions'].map(t => (
                <button
                  key={t}
                  className={`adm-tab${activeTab === t ? ' active' : ''}`}
                  onClick={() => setActiveTab(t)}
                >
                  {t === 'desks' ? 'Desks' : 'Session Log'}
                  <span className="adm-tab-count">
                    {t === 'desks' ? desks.length : sessions.length}
                  </span>
                </button>
              ))}
            </div>

            {activeTab === 'desks' && (
              <div className="adm-filters">
                <input
                  className="adm-search"
                  type="search"
                  placeholder="Search desk or roll no…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                <div className="adm-pills">
                  {['all', 'free', 'occupied', 'away', 'abandoned'].map(f => (
                    <button
                      key={f}
                      className={`adm-pill${filter === f ? ' active' : ''}`}
                      onClick={() => setFilter(f)}
                      style={filter === f && f !== 'all'
                        ? { borderColor: STATUS_META[f].color, color: STATUS_META[f].color, background: STATUS_META[f].bg }
                        : {}
                      }
                    >
                      {f === 'all' ? 'All' : STATUS_META[f].label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {activeTab === 'desks' && (
            <div className="adm-table-wrap">
              {filteredDesks.length === 0
                ? <div className="adm-empty">No desks match your filter.</div>
                : (
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th>Desk</th><th>Status</th><th>Roll no.</th>
                        <th>Checked in</th><th>Expires</th><th />
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDesks.map(d => (
                        <tr key={d.id} className={`adm-row${d.status === 'abandoned' ? ' row-abandoned' : ''}`}>
                          <td>
                            <span className="adm-desk-id">{d.id}</span>
                            {d.section && <span className="adm-section">§{d.section}</span>}
                          </td>
                          <td><StatusPip status={d.status} /></td>
                          <td><span className="adm-roll">{d.student_id || <span className="adm-nil">—</span>}</span></td>
                          <td className="adm-time">{timeAgo(d.checked_in_at)}</td>
                          <td className="adm-time">{timeLeft(d.expires_at)}</td>
                          <td>
                            {d.status !== 'free' && (
                              <button
                                className="adm-reset-btn"
                                onClick={() => resetDesk(d.id)}
                                disabled={resetingId === d.id}
                              >
                                {resetingId === d.id ? '…' : 'Free seat'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              }
            </div>
          )}

          {activeTab === 'sessions' && (
            <div className="adm-table-wrap">
              {sessions.length === 0
                ? <div className="adm-empty">No session history yet.</div>
                : (
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th>Desk</th><th>Roll no.</th><th>Checked in</th>
                        <th>Duration</th><th>Ended by</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map(s => (
                        <tr key={s.id} className="adm-row">
                          <td><span className="adm-desk-id">{s.desk_id}</span></td>
                          <td><span className="adm-roll">{s.student_id}</span></td>
                          <td className="adm-time">{timeAgo(s.checked_in_at)}</td>
                          <td className="adm-time">
                            {s.duration_mins != null
                              ? `${s.duration_mins} min`
                              : <span className="adm-nil">active</span>}
                          </td>
                          <td>
                            <span className={`adm-reason adm-reason-${s.end_reason || 'active'}`}>
                              {s.end_reason || 'active'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              }
            </div>
          )}

        </div>
      </div>
    </>
  )
}

/* ── SCOPED CSS — injected via <style> so it doesn't bleed into HomePage ── */
const ADM_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap');

  .adm-root {
    min-height: 100vh;
    background: #0c0e14;
    color: #e2e4ed;
    font-family: 'Inter', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  /* ── Login ─────────────────────────────── */
  .adm-login {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem 1rem;
    gap: 1rem;
    max-width: 400px;
    margin: 0 auto;
  }
  .adm-login-brand {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin-bottom: 0.5rem;
  }
  .adm-brand-text {
    font-size: 1.1rem;
    font-weight: 700;
    color: #e2e4ed;
    letter-spacing: -0.02em;
  }
  .adm-login-title {
    font-size: 1.6rem;
    font-weight: 700;
    letter-spacing: -0.03em;
    text-align: center;
  }
  .adm-login-hint {
    font-size: 0.85rem;
    color: #6b7291;
    text-align: center;
    margin-bottom: 0.5rem;
  }
  .adm-field {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  .adm-label {
    font-size: 0.78rem;
    color: #6b7291;
    font-weight: 500;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .adm-input {
    background: #151720;
    border: 1px solid #252836;
    border-radius: 8px;
    color: #e2e4ed;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.95rem;
    padding: 0.7rem 0.9rem;
    width: 100%;
    transition: border-color 0.15s;
  }
  .adm-input:focus {
    outline: none;
    border-color: #f59e0b;
  }
  .adm-error-bar {
    width: 100%;
    background: #1f0a0a;
    border: 1px solid #5c1f1f;
    color: #fca5a5;
    border-radius: 8px;
    padding: 0.6rem 0.9rem;
    font-size: 0.83rem;
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  .adm-btn-primary {
    width: 100%;
    background: #f59e0b;
    color: #1a0a00;
    border: none;
    border-radius: 8px;
    padding: 0.75rem;
    font-size: 0.9rem;
    font-weight: 700;
    cursor: pointer;
    transition: opacity 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }
  .adm-btn-primary:hover:not(:disabled) { opacity: 0.88; }
  .adm-btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
  .adm-back-link {
    font-size: 0.82rem;
    color: #4b5180;
    text-decoration: none;
    margin-top: 0.25rem;
    transition: color 0.15s;
  }
  .adm-back-link:hover { color: #8b90b8; }

  /* ── Monogram ──────────────────────────── */
  .adm-monogram {
    width: 38px;
    height: 38px;
    border-radius: 8px;
    background: #f59e0b;
    color: #1a0a00;
    font-family: 'JetBrains Mono', monospace;
    font-weight: 700;
    font-size: 0.85rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    letter-spacing: -0.03em;
  }
  .adm-monogram.sm { width: 32px; height: 32px; font-size: 0.75rem; }

  /* ── Header ────────────────────────────── */
  .adm-header {
    border-bottom: 1px solid #1c1f2e;
    padding: 0 1.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 60px;
    background: #0f1119;
    position: sticky;
    top: 0;
    z-index: 50;
  }
  .adm-header-left { display: flex; align-items: center; gap: 0.75rem; }
  .adm-header-right { display: flex; align-items: center; gap: 0.5rem; }
  .adm-page-title {
    font-size: 0.95rem;
    font-weight: 700;
    color: #e2e4ed;
    line-height: 1.1;
  }
  .adm-page-sub {
    font-size: 0.72rem;
    color: #4b5180;
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }
  .adm-live-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #22c55e;
    display: inline-block;
    animation: livePulse 2s ease-in-out infinite;
  }
  @keyframes livePulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
  .adm-btn-ghost {
    background: #1c1f2e;
    border: 1px solid #252836;
    border-radius: 6px;
    color: #8b90b8;
    font-size: 0.82rem;
    font-weight: 500;
    padding: 0.35rem 0.85rem;
    cursor: pointer;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    transition: color 0.15s, border-color 0.15s;
  }
  .adm-btn-ghost:hover { color: #e2e4ed; border-color: #3a3f5c; }
  .adm-btn-ghost:disabled { opacity: 0.4; cursor: not-allowed; }

  /* ── Body layout ───────────────────────── */
  .adm-body {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem 1.5rem 4rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  /* ── Stat cards ────────────────────────── */
  .adm-stats-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.75rem;
  }
  .stat-card {
    background: #0f1119;
    border: 1px solid #1c1f2e;
    border-radius: 12px;
    padding: 1.25rem 1.25rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }
  .stat-value {
    font-family: 'JetBrains Mono', monospace;
    font-size: 2rem;
    font-weight: 700;
    line-height: 1;
    letter-spacing: -0.04em;
  }
  .stat-label {
    font-size: 0.78rem;
    color: #6b7291;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 600;
    margin-top: 0.2rem;
  }
  .stat-sub {
    font-size: 0.72rem;
    color: #3a3f5c;
    margin-top: 0.1rem;
  }

  /* ── Alert banner ──────────────────────── */
  .adm-alert {
    background: #1a0e00;
    border: 1px solid #78350f;
    border-radius: 10px;
    padding: 1rem 1.25rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .adm-alert-left { display: flex; align-items: flex-start; gap: 0.75rem; }
  .adm-alert-icon { font-size: 1.1rem; margin-top: 1px; flex-shrink: 0; }
  .adm-alert-title { font-size: 0.9rem; font-weight: 600; color: #fbbf24; }
  .adm-alert-sub { font-size: 0.78rem; color: #92670a; margin-top: 0.15rem; }
  .adm-btn-amber {
    background: #f59e0b;
    color: #1a0a00;
    border: none;
    border-radius: 6px;
    padding: 0.5rem 1rem;
    font-size: 0.83rem;
    font-weight: 700;
    cursor: pointer;
    white-space: nowrap;
    transition: opacity 0.15s;
    flex-shrink: 0;
  }
  .adm-btn-amber:hover:not(:disabled) { opacity: 0.88; }
  .adm-btn-amber:disabled { opacity: 0.4; cursor: not-allowed; }

  /* ── Toolbar ────────────────────────────── */
  .adm-toolbar {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.75rem;
  }
  .adm-tabs {
    display: flex;
    gap: 0.25rem;
    background: #0f1119;
    border: 1px solid #1c1f2e;
    border-radius: 8px;
    padding: 3px;
  }
  .adm-tab {
    background: none;
    border: none;
    border-radius: 6px;
    color: #4b5180;
    font-size: 0.83rem;
    font-weight: 600;
    padding: 0.4rem 0.9rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    transition: background 0.15s, color 0.15s;
  }
  .adm-tab.active {
    background: #1c1f2e;
    color: #e2e4ed;
  }
  .adm-tab-count {
    background: #1c1f2e;
    color: #6b7291;
    border-radius: 99px;
    font-size: 0.7rem;
    padding: 1px 7px;
    font-family: 'JetBrains Mono', monospace;
  }
  .adm-tab.active .adm-tab-count {
    background: #252836;
    color: #e2e4ed;
  }
  .adm-filters {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .adm-search {
    background: #0f1119;
    border: 1px solid #1c1f2e;
    border-radius: 7px;
    color: #e2e4ed;
    font-size: 0.82rem;
    padding: 0.42rem 0.8rem;
    width: 200px;
    transition: border-color 0.15s;
    font-family: 'JetBrains Mono', monospace;
  }
  .adm-search:focus { outline: none; border-color: #f59e0b; }
  .adm-pills { display: flex; gap: 0.3rem; flex-wrap: wrap; }
  .adm-pill {
    background: #0f1119;
    border: 1px solid #1c1f2e;
    border-radius: 99px;
    color: #4b5180;
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.25rem 0.75rem;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
  }
  .adm-pill:hover { border-color: #3a3f5c; color: #8b90b8; }
  .adm-pill.active { background: #1c1f2e; color: #e2e4ed; border-color: #3a3f5c; }

  /* ── Table ──────────────────────────────── */
  .adm-table-wrap {
    background: #0f1119;
    border: 1px solid #1c1f2e;
    border-radius: 12px;
    overflow: hidden;
    overflow-x: auto;
  }
  .adm-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.83rem;
  }
  .adm-table thead {
    background: #0c0e14;
    border-bottom: 1px solid #1c1f2e;
  }
  .adm-table th {
    color: #3a3f5c;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    text-align: left;
    padding: 0.7rem 1rem;
    white-space: nowrap;
  }
  .adm-row { border-bottom: 1px solid #13151f; transition: background 0.1s; }
  .adm-row:last-child { border-bottom: none; }
  .adm-row:hover { background: #13151f; }
  .adm-row td { padding: 0.7rem 1rem; vertical-align: middle; }
  .row-abandoned {
    background: rgba(251, 146, 60, 0.03);
    animation: rowPulse 3s ease-in-out infinite;
  }
  @keyframes rowPulse {
    0%, 100% { background: rgba(251, 146, 60, 0.03); }
    50% { background: rgba(251, 146, 60, 0.07); }
  }

  /* ── Cell types ─────────────────────────── */
  .adm-desk-id {
    font-family: 'JetBrains Mono', monospace;
    font-weight: 700;
    font-size: 0.88rem;
    color: #e2e4ed;
  }
  .adm-section {
    font-size: 0.7rem;
    color: #3a3f5c;
    margin-left: 0.4rem;
    font-family: 'JetBrains Mono', monospace;
  }
  .adm-roll {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.82rem;
    color: #8b90b8;
  }
  .adm-time { color: #4b5180; font-size: 0.78rem; white-space: nowrap; }
  .adm-nil { color: #252836; }

  /* ── Status pip ─────────────────────────── */
  .status-pip {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    background: var(--pip-bg);
    color: var(--pip-color);
    border: 1px solid color-mix(in srgb, var(--pip-color) 30%, transparent);
    border-radius: 99px;
    font-size: 0.73rem;
    font-weight: 600;
    padding: 0.2rem 0.65rem;
    white-space: nowrap;
  }
  .pip-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
    flex-shrink: 0;
  }
  .pip-pulse {
    animation: pipPulse 1.4s ease-in-out infinite;
  }
  @keyframes pipPulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(0.7); }
  }

  /* ── Reset button ───────────────────────── */
  .adm-reset-btn {
    background: transparent;
    border: 1px solid #2e1f0a;
    color: #92670a;
    border-radius: 5px;
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.28rem 0.7rem;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.15s;
  }
  .adm-reset-btn:hover:not(:disabled) {
    background: #1a0e00;
    border-color: #78350f;
    color: #fbbf24;
  }
  .adm-reset-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  /* ── Reason badge ───────────────────────── */
  .adm-reason {
    font-size: 0.72rem;
    font-weight: 600;
    border-radius: 99px;
    padding: 0.2rem 0.6rem;
    font-family: 'JetBrains Mono', monospace;
    background: #1c1f2e;
    color: #4b5180;
    border: 1px solid #252836;
  }
  .adm-reason-student  { background: #052e16; color: #22c55e; border-color: #14532d; }
  .adm-reason-timeout  { background: #431407; color: #fb923c; border-color: #7c2d12; }
  .adm-reason-admin    { background: #172554; color: #60a5fa; border-color: #1e3a8a; }
  .adm-reason-active   { background: #0f172a; color: #475569; border-color: #1e293b; }

  /* ── Empty state ────────────────────────── */
  .adm-empty {
    text-align: center;
    color: #3a3f5c;
    padding: 3rem;
    font-size: 0.85rem;
  }

  /* ── Toast ──────────────────────────────── */
  .adm-toast {
    position: fixed;
    bottom: 1.5rem;
    left: 50%;
    transform: translateX(-50%);
    background: #052e16;
    border: 1px solid #14532d;
    color: #22c55e;
    border-radius: 8px;
    padding: 0.6rem 1.25rem;
    font-size: 0.83rem;
    font-weight: 600;
    z-index: 999;
    white-space: nowrap;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    animation: toastIn 0.2s ease;
  }
  @keyframes toastIn {
    from { opacity: 0; transform: translateX(-50%) translateY(8px); }
    to   { opacity: 1; transform: translateX(-50%) translateY(0); }
  }

  /* ── Responsive ─────────────────────────── */
  @media (max-width: 700px) {
    .adm-stats-row { grid-template-columns: repeat(2, 1fr); }
    .adm-toolbar { flex-direction: column; }
    .adm-filters { width: 100%; }
    .adm-search { width: 100%; }
    .adm-header { padding: 0 1rem; }
    .adm-body { padding: 1.25rem 1rem 3rem; }
  }
  @media (max-width: 420px) {
    .adm-stats-row { grid-template-columns: repeat(2, 1fr); gap: 0.5rem; }
    .stat-value { font-size: 1.6rem; }
  }
  @media (prefers-reduced-motion: reduce) {
    .row-abandoned, .pip-pulse, .adm-live-dot { animation: none; }
  }
`