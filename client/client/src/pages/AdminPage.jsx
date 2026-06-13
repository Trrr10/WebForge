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
  free:      { color: '#4ade80', bg: '#052e16', label: 'Free' },
  occupied:  { color: '#93c5fd', bg: '#172554', label: 'Occupied' },
  away:      { color: '#fcd34d', bg: '#431a00', label: 'Away' },
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

// ── Heatmap ────────────────────────────────────────────────────────────────
const DESK_W = 52, DESK_H = 40, COL_GAP = 14, ROW_GAP = 12
const SECTION_GAP = 56, PADDING = 36, TOP = 88, ROWS = 5

const SECTION_X = {
  A: PADDING,
  B: PADDING + (DESK_W * 2 + COL_GAP) + SECTION_GAP,
  C: PADDING + (DESK_W * 2 + COL_GAP) * 2 + SECTION_GAP * 2,
}
const HMAP_W = PADDING * 2 + (DESK_W * 2 + COL_GAP) * 3 + SECTION_GAP * 2
const HMAP_H = TOP + ROWS * (DESK_H + ROW_GAP) - ROW_GAP + PADDING * 2 + 32

function heatColor(value, max) {
  if (max === 0 || !value) return { bg: '#1e2235', border: '#2d3352', text: '#6b7db3' }
  const t = value / max
  if (t < 0.25) return { bg: '#431407', border: '#7c2d12', text: '#fdba74' }
  if (t < 0.5)  return { bg: '#7c2d12', border: '#c2410c', text: '#fed7aa' }
  if (t < 0.75) return { bg: '#c2410c', border: '#ea580c', text: '#fff7ed' }
  return               { bg: '#991b1b', border: '#dc2626', text: '#fee2e2' }
}

function getPos(desk) {
  if (desk.col_num && desk.row_num) {
    return { section: desk.section, col_num: desk.col_num, row_num: desk.row_num }
  }
  const section = desk.id[0]
  const num     = parseInt(desk.id.slice(1))
  return { section, col_num: num % 2 === 0 ? 2 : 1, row_num: Math.ceil(num / 2) }
}

function DeskHeatmap({ desks = [], heatData = {} }) {
  const allDesks = desks.length > 0 ? desks : Object.keys(heatData).map(id => ({ id }))
  const values   = Object.values(heatData)
  const maxVal   = values.length ? Math.max(...values) : 0
  const totalBookings = values.reduce((a, b) => a + b, 0)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: '#6b7db3', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600 }}>
          Booking frequency
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {['#1e2235','#431407','#7c2d12','#c2410c','#991b1b'].map((c, i) => (
            <div key={i} style={{ width: 22, height: 14, background: c, borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)' }} />
          ))}
        </div>
        <span style={{ fontSize: 11, color: '#6b7db3' }}>Low → High</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#94a3c4', fontWeight: 600 }}>
          {totalBookings} total bookings
        </span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${HMAP_W} ${HMAP_H}`} width="100%"
             style={{ maxWidth: HMAP_W, display: 'block' }}>
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          {/* Section label backgrounds */}
          {['A','B','C'].map(sec => {
            const cx = SECTION_X[sec] + DESK_W + COL_GAP / 2
            return (
              <g key={sec}>
                <rect x={SECTION_X[sec] - 6} y={TOP - 36} width={DESK_W * 2 + COL_GAP + 12} height={22}
                      rx="6" fill="#252d45" opacity="0.7" />
                <text x={cx} y={TOP - 21} textAnchor="middle"
                      fontSize="11" fontWeight="700" fill="#a0aec8" letterSpacing="2">
                  SECTION {sec}
                </text>
              </g>
            )
          })}

          {/* Aisle dividers */}
          {['A','B'].map(sec => {
            const x = SECTION_X[sec] + DESK_W * 2 + COL_GAP + SECTION_GAP / 2
            return (
              <line key={sec} x1={x} y1={TOP - 8} x2={x}
                    y2={TOP + ROWS * (DESK_H + ROW_GAP) - ROW_GAP + 8}
                    stroke="#2d3352" strokeWidth="1.5" strokeDasharray="5 5" />
            )
          })}

          {/* Desks */}
          {allDesks.map(desk => {
            const { section, col_num, row_num } = getPos(desk)
            const sx = SECTION_X[section]
            if (!sx) return null
            const x     = sx + (col_num - 1) * (DESK_W + COL_GAP)
            const y     = TOP + (row_num - 1) * (DESK_H + ROW_GAP)
            const count = heatData[desk.id] ?? 0
            const { bg, border, text } = heatColor(count, maxVal)
            const isHot = count > 0

            return (
              <g key={desk.id}>
                {/* Glow effect for hot desks */}
                {isHot && (
                  <rect x={x - 2} y={y - 2} width={DESK_W + 4} height={DESK_H + 4}
                        rx="7" fill={bg} opacity="0.3" filter="url(#glow)" />
                )}
                {/* Desk body */}
                <rect x={x} y={y} width={DESK_W} height={DESK_H} rx="6"
                      fill={bg} stroke={border} strokeWidth="1.5" />
                {/* Desk ID */}
                <text x={x + DESK_W / 2} y={y + DESK_H / 2 - 5}
                      textAnchor="middle" fontSize="11" fontWeight="700" fill={text}>
                  {desk.id}
                </text>
                {/* Count */}
                <text x={x + DESK_W / 2} y={y + DESK_H / 2 + 10}
                      textAnchor="middle" fontSize="10" fill={text} opacity="0.85">
                  {count}x
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

// ── Peak Hours Chart ────────────────────────────────────────────────────────
const DAYS  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const HOURS = Array.from({ length: 17 }, (_, i) => i + 6)

function peakCellColor(value, max) {
  if (!value || max === 0) return '#1e2235'
  const t = value / max
  if (t < 0.2)  return '#431407'
  if (t < 0.4)  return '#7c2d12'
  if (t < 0.6)  return '#c2410c'
  if (t < 0.8)  return '#b45309'
  return '#991b1b'
}

function peakCellTextColor(value, max) {
  if (!value || max === 0) return '#2d3a5a'
  const t = value / max
  if (t < 0.2) return '#fb923c'
  if (t < 0.4) return '#fdba74'
  return '#fff7ed'
}

function PeakHoursChart({ data = [] }) {
  const grid = {}
  for (const row of data) {
    if (!grid[row.day_of_week]) grid[row.day_of_week] = {}
    grid[row.day_of_week][row.hour_of_day] = row.booking_count
  }
  const allValues = data.map(r => r.booking_count)
  const maxVal    = allValues.length ? Math.max(...allValues) : 0

  const CELL_W = 38, CELL_H = 30, GAP = 4, LEFT = 42, TOP_P = 32
  const svgW = LEFT + HOURS.length * (CELL_W + GAP)
  const svgH = TOP_P + DAYS.length  * (CELL_H + GAP) + 24

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${svgW} ${svgH}`} width="100%"
           style={{ maxWidth: svgW, display: 'block' }}>

        {/* Hour labels */}
        {HOURS.map((h, hi) => (
          <text key={h}
                x={LEFT + hi * (CELL_W + GAP) + CELL_W / 2} y={TOP_P - 10}
                textAnchor="middle" fontSize="10" fontWeight="600" fill="#6b7db3">
            {h % 12 || 12}{h < 12 ? 'a' : 'p'}
          </text>
        ))}

        {/* Day rows */}
        {DAYS.map((day, di) => (
          <g key={day}>
            {/* Day label pill background */}
            <rect x={0} y={TOP_P + di * (CELL_H + GAP) + 2}
                  width={LEFT - 6} height={CELL_H - 4} rx="4" fill="#252d45" opacity="0.6" />
            <text x={LEFT - 10} y={TOP_P + di * (CELL_H + GAP) + CELL_H / 2 + 4}
                  textAnchor="end" fontSize="11" fill="#94a3c4" fontWeight="600">
              {day}
            </text>

            {/* Cells */}
            {HOURS.map((h, hi) => {
              const val = grid[di]?.[h] ?? 0
              return (
                <rect key={h}
                      x={LEFT + hi * (CELL_W + GAP)}
                      y={TOP_P + di * (CELL_H + GAP)}
                      width={CELL_W} height={CELL_H} rx="4"
                      fill={peakCellColor(val, maxVal)}
                      stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
              )
            })}

            {/* Count labels */}
            {HOURS.map((h, hi) => {
              const val = grid[di]?.[h] ?? 0
              if (!val) return null
              return (
                <text key={h}
                      x={LEFT + hi * (CELL_W + GAP) + CELL_W / 2}
                      y={TOP_P + di * (CELL_H + GAP) + CELL_H / 2 + 4}
                      textAnchor="middle" fontSize="10" fontWeight="600"
                      fill={peakCellTextColor(val, maxVal)}>
                  {val}
                </text>
              )
            })}
          </g>
        ))}

        {/* Legend */}
        <g>
          {['#1e2235','#431407','#7c2d12','#c2410c','#991b1b'].map((c, i) => (
            <rect key={i} x={LEFT + i * 22} y={svgH - 14}
                  width={18} height={10} rx="3" fill={c}
                  stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          ))}
          <text x={LEFT + 5 * 22 + 6} y={svgH - 6}
                fontSize="10" fontWeight="600" fill="#6b7db3">
            Low → High
          </text>
        </g>
      </svg>
    </div>
  )
}

// ── Main AdminPage ──────────────────────────────────────────────────────────
export default function AdminPage() {
  const [token, setToken]           = useState('')
  const [authed, setAuthed]         = useState(false)
  const [desks, setDesks]           = useState([])
  const [sessions, setSessions]     = useState([])
  const [stats, setStats]           = useState(null)
  const [analytics, setAnalytics]   = useState({ heatmap: {}, peakHours: [], daily: [], sections: [] })
  const [loading, setLoading]       = useState(false)
  const [resetingId, setResetingId] = useState(null)
  const [error, setError]           = useState('')
  const [activeTab, setActiveTab]   = useState('desks')
  const [search, setSearch]         = useState('')
  const [filter, setFilter]         = useState('all')
  const [lastRefresh, setLastRefresh] = useState(null)
  const [successMsg, setSuccessMsg]   = useState('')

  const fetchAll = useCallback(async () => {
    const headers = { 'Content-Type': 'application/json', 'x-admin-token': token }
    setLoading(true)
    setError('')
    try {
      const [dRes, sRes, stRes, hmRes, phRes, dailyRes, secRes] = await Promise.all([
        fetch(`${API}/api/admin/desks`,                { headers }),
        fetch(`${API}/api/admin/sessions`,             { headers }),
        fetch(`${API}/api/admin/stats`,                { headers }),
        fetch(`${API}/api/admin/analytics/heatmap`,    { headers }),
        fetch(`${API}/api/admin/analytics/peak-hours`, { headers }),
        fetch(`${API}/api/admin/analytics/daily`,      { headers }),
        fetch(`${API}/api/admin/analytics/sections`,   { headers }),
      ])
      if (!dRes.ok) throw new Error('Invalid token. Try again.')
      const [d, s, st, hm, ph, daily, sec] = await Promise.all([
        dRes.json(), sRes.json(), stRes.json(),
        hmRes.json(), phRes.json(), dailyRes.json(), secRes.json(),
      ])
      setDesks(d)
      setSessions(s)
      setStats(st)
      setAnalytics({ heatmap: hm, peakHours: ph, daily, sections: sec })
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
    const headers = { 'Content-Type': 'application/json', 'x-admin-token': token }
    setResetingId(id)
    await fetch(`${API}/api/admin/reset/${id}`, { method: 'POST', headers })
    await fetchAll()
    setResetingId(null)
    flash('Desk freed.')
  }

  async function resetAll() {
    const headers = { 'Content-Type': 'application/json', 'x-admin-token': token }
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
                id="tok" className="adm-input" type="password"
                placeholder="••••••••••••" value={token}
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
              <StatCard label="Free"      value={stats.free}      color="#4ade80" sublabel={`of ${stats.total} seats`} />
              <StatCard label="Occupied"  value={stats.occupied}  color="#93c5fd" />
              <StatCard label="Away"      value={stats.away}      color="#fcd34d" sublabel="paused ≤20 min" />
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
              {['desks','sessions','analytics'].map(t => (
                <button
                  key={t}
                  className={`adm-tab${activeTab === t ? ' active' : ''}`}
                  onClick={() => setActiveTab(t)}
                >
                  {t === 'desks' ? 'Desks' : t === 'sessions' ? 'Session Log' : 'Analytics'}
                  {t !== 'analytics' && (
                    <span className="adm-tab-count">
                      {t === 'desks' ? desks.length : sessions.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {activeTab === 'desks' && (
              <div className="adm-filters">
                <input
                  className="adm-search" type="search"
                  placeholder="Search desk or roll no…"
                  value={search} onChange={e => setSearch(e.target.value)}
                />
                <div className="adm-pills">
                  {['all','free','occupied','away','abandoned'].map(f => (
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

          {/* ── Desks tab ── */}
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

          {/* ── Sessions tab ── */}
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

          {/* ── Analytics tab ── */}
          {activeTab === 'analytics' && (
            <div className="adm-analytics">

              <div className="adm-analytics-card">
                <h2 className="adm-analytics-title">Desk heatmap</h2>
                <p className="adm-analytics-sub">All-time check-ins per seat</p>
                {Object.keys(analytics.heatmap).length === 0
                  ? <div className="adm-empty">No booking data yet.</div>
                  : <DeskHeatmap desks={desks} heatData={analytics.heatmap} />
                }
              </div>

              <div className="adm-analytics-card">
                <h2 className="adm-analytics-title">Peak hours</h2>
                <p className="adm-analytics-sub">Check-ins by day of week and hour</p>
                {analytics.peakHours.length === 0
                  ? <div className="adm-empty">No peak-hours data yet.</div>
                  : <PeakHoursChart data={analytics.peakHours} />
                }
              </div>

              {analytics.daily.length > 0 && (
                <div className="adm-analytics-card">
                  <h2 className="adm-analytics-title">Daily summary</h2>
                  <p className="adm-analytics-sub">Last 30 days</p>
                  <div className="adm-table-wrap" style={{ marginTop: 12 }}>
                    <table className="adm-table">
                      <thead>
                        <tr>
                          <th>Date</th><th>Check-ins</th><th>Avg duration (min)</th><th>Peak hour</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.daily.map((row, i) => (
                          <tr key={i} className="adm-row">
                            <td className="adm-time">{row.date}</td>
                            <td><span className="adm-desk-id">{row.checkin_count ?? '—'}</span></td>
                            <td className="adm-time">{row.avg_duration_mins != null ? Math.round(row.avg_duration_mins) : '—'}</td>
                            <td className="adm-time">{row.peak_hour != null ? `${row.peak_hour}:00` : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {analytics.sections.length > 0 && (
                <div className="adm-analytics-card">
                  <h2 className="adm-analytics-title">Section breakdown</h2>
                  <p className="adm-analytics-sub">Usage by library section</p>
                  <div className="adm-table-wrap" style={{ marginTop: 12 }}>
                    <table className="adm-table">
                      <thead>
                        <tr>
                          <th>Section</th><th>Check-ins</th><th>Avg duration (min)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.sections.map((row, i) => (
                          <tr key={i} className="adm-row">
                            <td><span className="adm-desk-id">§{row.section}</span></td>
                            <td><span className="adm-roll">{row.checkin_count ?? '—'}</span></td>
                            <td className="adm-time">{row.avg_duration_mins != null ? Math.round(row.avg_duration_mins) : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>
      </div>
    </>
  )
}

const ADM_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap');

  .adm-root {
    min-height: 100vh;
    background: #080a12;
    color: #cdd5f0;
    font-family: 'Inter', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  /* ── Login ── */
  .adm-login {
    min-height: 100vh; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 2rem 1rem; gap: 1rem; max-width: 420px; margin: 0 auto;
  }
  .adm-login-brand { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.5rem; }
  .adm-brand-text { font-size: 1.15rem; font-weight: 700; color: #e8edf8; letter-spacing: -0.02em; }
  .adm-login-title { font-size: 1.7rem; font-weight: 700; letter-spacing: -0.03em; text-align: center; color: #e8edf8; }
  .adm-login-hint { font-size: 0.86rem; color: #6b7db3; text-align: center; margin-bottom: 0.5rem; }
  .adm-field { width: 100%; display: flex; flex-direction: column; gap: 0.4rem; }
  .adm-label { font-size: 0.78rem; color: #7b8ec4; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; }
  .adm-input {
    background: #111520; border: 1px solid #2a3050; border-radius: 8px;
    color: #cdd5f0; font-family: 'JetBrains Mono', monospace;
    font-size: 0.95rem; padding: 0.75rem 1rem; width: 100%; transition: border-color 0.15s, box-shadow 0.15s;
  }
  .adm-input:focus { outline: none; border-color: #f59e0b; box-shadow: 0 0 0 3px rgba(245,158,11,0.12); }
  .adm-error-bar {
    width: 100%; background: #1f0a0a; border: 1px solid #5c1f1f; color: #fca5a5;
    border-radius: 8px; padding: 0.65rem 1rem; font-size: 0.84rem; display: flex; gap: 0.5rem; align-items: center;
  }
  .adm-btn-primary {
    width: 100%; background: #f59e0b; color: #1a0a00; border: none; border-radius: 8px;
    padding: 0.8rem; font-size: 0.92rem; font-weight: 700; cursor: pointer; transition: opacity 0.15s, transform 0.1s;
    display: flex; align-items: center; justify-content: center; gap: 0.5rem; letter-spacing: 0.01em;
  }
  .adm-btn-primary:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
  .adm-btn-primary:active:not(:disabled) { transform: translateY(0); }
  .adm-btn-primary:disabled { opacity: 0.35; cursor: not-allowed; }
  .adm-back-link { font-size: 0.82rem; color: #4b5a8a; text-decoration: none; margin-top: 0.25rem; transition: color 0.15s; }
  .adm-back-link:hover { color: #94a3c4; }

  /* ── Monogram ── */
  .adm-monogram {
    width: 40px; height: 40px; border-radius: 10px; background: #f59e0b; color: #1a0a00;
    font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 0.88rem;
    display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
    letter-spacing: -0.03em; box-shadow: 0 2px 12px rgba(245,158,11,0.3);
  }
  .adm-monogram.sm { width: 34px; height: 34px; font-size: 0.78rem; }

  /* ── Header ── */
  .adm-header {
    border-bottom: 1px solid #161b2e; padding: 0 1.75rem; display: flex; align-items: center;
    justify-content: space-between; height: 62px; background: #0b0d18;
    position: sticky; top: 0; z-index: 50;
    box-shadow: 0 1px 0 rgba(255,255,255,0.04);
  }
  .adm-header-left { display: flex; align-items: center; gap: 0.85rem; }
  .adm-header-right { display: flex; align-items: center; gap: 0.5rem; }
  .adm-page-title { font-size: 0.97rem; font-weight: 700; color: #e8edf8; line-height: 1.1; }
  .adm-page-sub { font-size: 0.73rem; color: #4b5a8a; display: flex; align-items: center; gap: 0.4rem; margin-top: 2px; }
  .adm-live-dot {
    width: 6px; height: 6px; border-radius: 50%; background: #4ade80;
    display: inline-block; animation: livePulse 2s ease-in-out infinite;
    box-shadow: 0 0 6px rgba(74,222,128,0.5);
  }
  @keyframes livePulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
  .adm-btn-ghost {
    background: #141828; border: 1px solid #232a42; border-radius: 7px; color: #7b8ec4;
    font-size: 0.82rem; font-weight: 500; padding: 0.38rem 0.9rem; cursor: pointer;
    text-decoration: none; display: inline-flex; align-items: center; transition: all 0.15s;
  }
  .adm-btn-ghost:hover { color: #cdd5f0; border-color: #3a4468; background: #1c2236; }
  .adm-btn-ghost:disabled { opacity: 0.35; cursor: not-allowed; }

  /* ── Body ── */
  .adm-body { max-width: 1240px; margin: 0 auto; padding: 2rem 1.75rem 5rem; display: flex; flex-direction: column; gap: 1.25rem; }

  /* ── Stat cards ── */
  .adm-stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.85rem; }
  .stat-card {
    background: #0e1120; border: 1px solid #1a2038; border-radius: 14px;
    padding: 1.35rem 1.35rem 1.1rem; display: flex; flex-direction: column; gap: 0.2rem;
    transition: border-color 0.2s;
  }
  .stat-card:hover { border-color: #2a3458; }
  .stat-value { font-family: 'JetBrains Mono', monospace; font-size: 2.1rem; font-weight: 700; line-height: 1; letter-spacing: -0.04em; }
  .stat-label { font-size: 0.75rem; color: #7b8ec4; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; margin-top: 0.25rem; }
  .stat-sub { font-size: 0.72rem; color: #3a4870; margin-top: 0.1rem; }

  /* ── Alert ── */
  .adm-alert {
    background: #150c00; border: 1px solid #7c3a0a; border-radius: 12px; padding: 1.1rem 1.35rem;
    display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;
  }
  .adm-alert-left { display: flex; align-items: flex-start; gap: 0.85rem; }
  .adm-alert-icon { font-size: 1.15rem; margin-top: 1px; flex-shrink: 0; }
  .adm-alert-title { font-size: 0.92rem; font-weight: 700; color: #fbbf24; }
  .adm-alert-sub { font-size: 0.78rem; color: #a07020; margin-top: 0.2rem; }
  .adm-btn-amber {
    background: #f59e0b; color: #1a0a00; border: none; border-radius: 7px;
    padding: 0.55rem 1.1rem; font-size: 0.84rem; font-weight: 700; cursor: pointer;
    white-space: nowrap; transition: opacity 0.15s, transform 0.1s; flex-shrink: 0;
  }
  .adm-btn-amber:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
  .adm-btn-amber:disabled { opacity: 0.35; cursor: not-allowed; }

  /* ── Toolbar ── */
  .adm-toolbar { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 0.85rem; }
  .adm-tabs {
    display: flex; gap: 0.25rem; background: #0e1120; border: 1px solid #1a2038;
    border-radius: 10px; padding: 4px;
  }
  .adm-tab {
    background: none; border: none; border-radius: 7px; color: #4b5a8a; font-size: 0.84rem;
    font-weight: 600; padding: 0.45rem 1rem; cursor: pointer; display: flex; align-items: center;
    gap: 0.45rem; transition: background 0.15s, color 0.15s; letter-spacing: 0.01em;
  }
  .adm-tab.active { background: #1a2238; color: #cdd5f0; }
  .adm-tab:hover:not(.active) { color: #94a3c4; background: #131728; }
  .adm-tab-count {
    background: #1a2238; color: #7b8ec4; border-radius: 99px; font-size: 0.7rem;
    padding: 1px 8px; font-family: 'JetBrains Mono', monospace; font-weight: 600;
  }
  .adm-tab.active .adm-tab-count { background: #252e4a; color: #cdd5f0; }

  .adm-filters { display: flex; align-items: center; gap: 0.55rem; flex-wrap: wrap; }
  .adm-search {
    background: #0e1120; border: 1px solid #1a2038; border-radius: 8px; color: #cdd5f0;
    font-size: 0.83rem; padding: 0.45rem 0.9rem; width: 210px; transition: border-color 0.15s, box-shadow 0.15s;
    font-family: 'JetBrains Mono', monospace;
  }
  .adm-search:focus { outline: none; border-color: #f59e0b; box-shadow: 0 0 0 3px rgba(245,158,11,0.1); }
  .adm-search::placeholder { color: #3a4870; }
  .adm-pills { display: flex; gap: 0.3rem; flex-wrap: wrap; }
  .adm-pill {
    background: #0e1120; border: 1px solid #1a2038; border-radius: 99px; color: #4b5a8a;
    font-size: 0.75rem; font-weight: 600; padding: 0.28rem 0.8rem; cursor: pointer; transition: all 0.15s; white-space: nowrap;
  }
  .adm-pill:hover { border-color: #3a4468; color: #94a3c4; background: #131728; }
  .adm-pill.active { background: #1a2238; color: #cdd5f0; border-color: #3a4468; }

  /* ── Table ── */
  .adm-table-wrap { background: #0e1120; border: 1px solid #1a2038; border-radius: 14px; overflow: hidden; overflow-x: auto; }
  .adm-table { width: 100%; border-collapse: collapse; font-size: 0.84rem; }
  .adm-table thead { background: #090c16; border-bottom: 1px solid #161b2e; }
  .adm-table th {
    color: #4b5a8a; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em;
    text-transform: uppercase; text-align: left; padding: 0.8rem 1.1rem; white-space: nowrap;
  }
  .adm-row { border-bottom: 1px solid #111525; transition: background 0.1s; }
  .adm-row:last-child { border-bottom: none; }
  .adm-row:hover { background: #111525; }
  .adm-row td { padding: 0.75rem 1.1rem; vertical-align: middle; }
  .row-abandoned { background: rgba(251,146,60,0.04); animation: rowPulse 3s ease-in-out infinite; }
  @keyframes rowPulse { 0%,100% { background: rgba(251,146,60,0.04); } 50% { background: rgba(251,146,60,0.08); } }

  .adm-desk-id { font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 0.9rem; color: #cdd5f0; }
  .adm-section { font-size: 0.7rem; color: #3a4870; margin-left: 0.45rem; font-family: 'JetBrains Mono', monospace; }
  .adm-roll { font-family: 'JetBrains Mono', monospace; font-size: 0.83rem; color: #94a3c4; }
  .adm-time { color: #5a6a9a; font-size: 0.79rem; white-space: nowrap; }
  .adm-nil { color: #2a3458; }

  /* ── Status pip ── */
  .status-pip {
    display: inline-flex; align-items: center; gap: 0.38rem; background: var(--pip-bg); color: var(--pip-color);
    border: 1px solid color-mix(in srgb, var(--pip-color) 35%, transparent);
    border-radius: 99px; font-size: 0.74rem; font-weight: 700; padding: 0.22rem 0.7rem; white-space: nowrap;
    letter-spacing: 0.01em;
  }
  .pip-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
  .pip-pulse { animation: pipPulse 1.4s ease-in-out infinite; }
  @keyframes pipPulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.7); } }

  /* ── Reset button ── */
  .adm-reset-btn {
    background: transparent; border: 1px solid #2e1f0a; color: #a07020; border-radius: 6px;
    font-size: 0.76rem; font-weight: 600; padding: 0.3rem 0.8rem; cursor: pointer; white-space: nowrap; transition: all 0.15s;
  }
  .adm-reset-btn:hover:not(:disabled) { background: #1a0e00; border-color: #7c3a0a; color: #fbbf24; }
  .adm-reset-btn:disabled { opacity: 0.35; cursor: not-allowed; }

  /* ── Reason badge ── */
  .adm-reason {
    font-size: 0.73rem; font-weight: 700; border-radius: 99px; padding: 0.22rem 0.65rem;
    font-family: 'JetBrains Mono', monospace; background: #1a2238; color: #4b5a8a; border: 1px solid #252e4a;
  }
  .adm-reason-student { background: #052e16; color: #4ade80; border-color: #14532d; }
  .adm-reason-timeout { background: #431407; color: #fb923c; border-color: #7c2d12; }
  .adm-reason-admin   { background: #172554; color: #93c5fd; border-color: #1e3a8a; }
  .adm-reason-active  { background: #0f172a; color: #4b5a8a; border-color: #1e293b; }

  /* ── Empty ── */
  .adm-empty { text-align: center; color: #3a4870; padding: 3.5rem; font-size: 0.86rem; }

  /* ── Analytics ── */
  .adm-analytics { display: flex; flex-direction: column; gap: 1.25rem; }
  .adm-analytics-card {
    background: #0e1120; border: 1px solid #1a2038; border-radius: 14px; padding: 1.75rem;
  }
  .adm-analytics-title { font-size: 0.95rem; font-weight: 700; color: #cdd5f0; margin: 0 0 0.25rem; }
  .adm-analytics-sub { font-size: 0.76rem; color: #4b5a8a; margin: 0 0 1.5rem; font-weight: 500; }

  /* ── Toast ── */
  .adm-toast {
    position: fixed; bottom: 1.75rem; left: 50%; transform: translateX(-50%);
    background: #052e16; border: 1px solid #14532d; color: #4ade80; border-radius: 10px;
    padding: 0.65rem 1.4rem; font-size: 0.84rem; font-weight: 700; z-index: 999; white-space: nowrap;
    box-shadow: 0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(74,222,128,0.1);
    animation: toastIn 0.2s ease;
  }
  @keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }

  /* ── Responsive ── */
  @media (max-width: 700px) {
    .adm-stats-row { grid-template-columns: repeat(2, 1fr); }
    .adm-toolbar { flex-direction: column; }
    .adm-filters { width: 100%; }
    .adm-search { width: 100%; }
    .adm-header { padding: 0 1rem; }
    .adm-body { padding: 1.25rem 1rem 3rem; }
    .adm-analytics-card { padding: 1.25rem; }
  }
  @media (max-width: 420px) {
    .adm-stats-row { grid-template-columns: repeat(2, 1fr); gap: 0.6rem; }
    .stat-value { font-size: 1.7rem; }
  }
  @media (prefers-reduced-motion: reduce) {
    .row-abandoned, .pip-pulse, .adm-live-dot { animation: none; }
  }
`