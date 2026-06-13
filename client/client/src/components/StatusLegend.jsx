const ITEMS = [
  { color: '#22c55e', label: 'Free',      desc: 'Available to book' },
  { color: '#ef4444', label: 'Occupied',  desc: 'Someone is here' },
  { color: '#eab308', label: 'Away',      desc: 'Paused ≤ 20 min' },
  { color: '#f97316', label: 'Abandoned', desc: 'Auto-expired' },
];

export default function StatusLegend({ stats }) {
  return (
    <div className="legend-bar">
      {ITEMS.map(item => (
        <div className="legend-item" key={item.label}>
          <span className="legend-dot" style={{ background: item.color }} />
          <span className="legend-label">{item.label}</span>
          {stats && (
            <span className="legend-count">
              {stats[item.label.toLowerCase()] ?? 0}
            </span>
          )}
        </div>
      ))}
      {stats && (
        <div className="legend-total">
          {stats.free + stats.occupied + stats.away + stats.abandoned} total desks
        </div>
      )}
    </div>
  );
}