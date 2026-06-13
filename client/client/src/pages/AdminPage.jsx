import { useState, useEffect, useCallback } from 'react';

const API = import.meta.env.VITE_API_URL || '';

function timeAgo(isoString) {
  if (!isoString) return '—';
  const diff = Math.floor((Date.now() - new Date(isoString)) / 60000);
  if (diff < 1) return 'just now';
  if (diff === 1) return '1 min ago';
  return `${diff} min ago`;
}

const STATUS_COLOR = {
  free: '#22c55e', occupied: '#ef4444',
  away: '#eab308', abandoned: '#f97316',
};

export default function AdminPage() {
  const [token, setToken]       = useState('');
  const [authed, setAuthed]     = useState(false);
  const [desks, setDesks]       = useState([]);
  const [sessions, setSessions] = useState([]);
  const [stats, setStats]       = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [activeTab, setActiveTab] = useState('desks');

  const headers = { 'Content-Type': 'application/json', 'x-admin-token': token };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [dRes, sRes, stRes] = await Promise.all([
        fetch(`${API}/api/admin/desks`, { headers }),
        fetch(`${API}/api/admin/sessions`, { headers }),
        fetch(`${API}/api/admin/stats`, { headers }),
      ]);
      if (!dRes.ok) throw new Error('Unauthorized');
      setDesks(await dRes.json());
      setSessions(await sRes.json());
      setStats(await stRes.json());
      setAuthed(true);
    } catch (e) {
      setError(e.message);
      setAuthed(false);
    } finally {
      setLoading(false);
    }
  }, [token]);

  async function resetDesk(id) {
    await fetch(`${API}/api/admin/reset/${id}`, { method: 'POST', headers });
    fetchAll();
  }

  async function resetAll() {
    if (!confirm('Free all abandoned desks?')) return;
    await fetch(`${API}/api/admin/reset-all`, { method: 'POST', headers });
    fetchAll();
  }

  if (!authed) {
    return (
      <div className="page admin-login">
        <div className="login-box">
          <div className="logo-mark">DG</div>
          <h2 className="login-title">Librarian Access</h2>
          <p className="login-sub">Enter your admin token to continue.</p>
          <input
            className="text-input"
            type="password"
            placeholder="Admin token"
            value={token}
            onChange={e => setToken(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchAll()}
          />
          {error && <p className="input-error">{error}</p>}
          <button className="btn-primary" onClick={fetchAll} disabled={loading}>
            {loading ? 'Verifying…' : 'Sign In'}
          </button>
          <a href="/" className="admin-back">← Back to map</a>
        </div>
      </div>
    );
  }

  const abandonedDesks = desks.filter(d => d.status === 'abandoned');

  return (
    <div className="page admin-page">
      <header className="site-header">
        <div className="header-left">
          <div className="logo-mark">DG</div>
          <div>
            <h1 className="site-title">DeskGuard Admin</h1>
            <p className="site-sub">Librarian Dashboard</p>
          </div>
        </div>
        <div className="header-right">
          <button className="btn-secondary" onClick={fetchAll}>↻ Refresh</button>
          <a href="/" className="admin-link">← Map</a>
        </div>
      </header>

      <main className="main-content">
        {/* Stats */}
        {stats && (
          <div className="stat-pills">
            {['free','occupied','away','abandoned'].map(s => (
              <div className="stat-pill" key={s}>
                <span className="stat-num" style={{ color: STATUS_COLOR[s] }}>{stats[s]}</span>
                <span className="stat-label" style={{ textTransform: 'capitalize' }}>{s}</span>
              </div>
            ))}
            <div className="stat-pill">
              <span className="stat-num" style={{ color: '#94a3b8' }}>{stats.total}</span>
              <span className="stat-label">Total</span>
            </div>
          </div>
        )}

        {/* Abandoned alert */}
        {abandonedDesks.length > 0 && (
          <div className="abandoned-alert">
            <span>⚠️ {abandonedDesks.length} abandoned desk{abandonedDesks.length > 1 ? 's' : ''} need clearing.</span>
            <button className="btn-primary" onClick={resetAll}>Reset All Abandoned</button>
          </div>
        )}

        {/* Tabs */}
        <div className="tab-bar">
          <button className={`tab-btn ${activeTab === 'desks' ? 'active' : ''}`} onClick={() => setActiveTab('desks')}>
            Desks
          </button>
          <button className={`tab-btn ${activeTab === 'sessions' ? 'active' : ''}`} onClick={() => setActiveTab('sessions')}>
            Session Log
          </button>
        </div>

        {/* Desks table */}
        {activeTab === 'desks' && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Desk</th><th>Section</th><th>Status</th>
                  <th>Student</th><th>Checked In</th><th>Expires</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {desks.map(d => (
                  <tr key={d.id} className={d.status === 'abandoned' ? 'row-abandoned' : ''}>
                    <td><strong>{d.id}</strong></td>
                    <td>{d.section}</td>
                    <td>
                      <span className="status-badge" style={{ background: STATUS_COLOR[d.status] + '22', color: STATUS_COLOR[d.status], border: `1px solid ${STATUS_COLOR[d.status]}44` }}>
                        {d.status}
                      </span>
                    </td>
                    <td>{d.student_id || '—'}</td>
                    <td>{timeAgo(d.checked_in_at)}</td>
                    <td>{d.expires_at ? timeAgo(d.expires_at) + ' left' : '—'}</td>
                    <td>
                      {d.status !== 'free' && (
                        <button className="btn-sm-red" onClick={() => resetDesk(d.id)}>
                          Reset
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Sessions log */}
        {activeTab === 'sessions' && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Desk</th><th>Student</th><th>Checked In</th>
                  <th>Duration</th><th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map(s => (
                  <tr key={s.id}>
                    <td>{s.desk_id}</td>
                    <td>{s.student_id}</td>
                    <td>{timeAgo(s.checked_in_at)}</td>
                    <td>{s.duration_mins != null ? `${s.duration_mins} min` : '—'}</td>
                    <td>
                      <span className={`reason-badge reason-${s.end_reason}`}>
                        {s.end_reason || 'active'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}