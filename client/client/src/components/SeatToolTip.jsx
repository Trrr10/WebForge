import { createPortal } from 'react-dom';

function timeAgo(isoString) {
  if (!isoString) return null;
  const diff = Math.floor((Date.now() - new Date(isoString)) / 60000);
  if (diff < 1) return 'just now';
  if (diff === 1) return '1 min ago';
  return `${diff} min ago`;
}

const STATUS_LABEL = {
  free:      '🟢 Free',
  occupied:  '🔴 Occupied',
  away:      '🟡 Away',
  abandoned: '🟠 Abandoned',
};

export default function SeatTooltip({ desk, x, y }) {
  if (!desk) return null;

  const content = (
    <div
      style={{
        position: 'fixed',
        left: x,
        top: y,
        transform: 'translate(-50%, -100%)',
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      <div className="tooltip-box">
        <div className="tooltip-title">{desk.label}</div>
        <div className="tooltip-status">{STATUS_LABEL[desk.status] || desk.status}</div>
        {desk.student_id && (
          <div className="tooltip-row">
            <span className="tooltip-key">Student</span>
            <span className="tooltip-val">{desk.student_id}</span>
          </div>
        )}
        {desk.checked_in_at && (
          <div className="tooltip-row">
            <span className="tooltip-key">Checked in</span>
            <span className="tooltip-val">{timeAgo(desk.checked_in_at)}</span>
          </div>
        )}
        {desk.status === 'away' && desk.away_at && (
          <div className="tooltip-row">
            <span className="tooltip-key">Away since</span>
            <span className="tooltip-val">{timeAgo(desk.away_at)}</span>
          </div>
        )}
        {desk.status === 'free' && (
          <div className="tooltip-cta">Click to check in →</div>
        )}
        <div className="tooltip-arrow" />
      </div>
    </div>
  );

  return createPortal(content, document.body);
}