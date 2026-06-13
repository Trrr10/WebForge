/**
 * LibraryMap.jsx
 * Drop in src/components/LibraryMap.jsx
 *
 * A floor plan that actually looks like a library reading room instead of
 * an exam hall: three distinct zones (a window-side reading alcove, a long
 * communal table hall, and circular group-study pods), separated by
 * bookshelf dividers, with a circulation desk, windows, plants and a
 * "new arrivals" shelf near the entrance.
 *
 * Desk data shape is unchanged: { id, section: 'A'|'B'|'C', row_num, col_num,
 * status, student_id }. Only the visual placement changed.
 */
import { useState } from 'react'
import { STATUS } from '../lib/theme'

const DESK_W = 50
const DESK_H = 40
const SVG_W  = 1040
const SVG_H  = 760

const ROOM_LABEL = {
  A: 'Reading Alcove',
  B: 'Long Table Hall',
  C: 'Group Study Pods',
}

function getDeskPos(section, row_num, col_num) {
  const r = row_num - 1
  switch (section) {
    case 'A': {
      // Cosy window-side alcove: tight 2-up grid with a shared table strip
      const x = 110 + (col_num - 1) * (DESK_W + 18)
      const y = 215 + r * (DESK_H + 22)
      return { x, y }
    }
    case 'B': {
      // Long communal tables: two seats facing each other across a table
      const x = col_num === 1 ? 430 : 630
      const y = 225 + r * (DESK_H + 34)
      return { x, y }
    }
    case 'C': {
      // Group pods: two seats around a small round table
      const x = col_num === 1 ? 790 : 874
      const y = 225 + r * (DESK_H + 34)
      return { x, y }
    }
    default:
      return { x: 0, y: 0 }
  }
}

function lighten(hex) {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.min(255, ((n >> 16) & 0xff) + 26)
  const g = Math.min(255, ((n >> 8) & 0xff) + 26)
  const b = Math.min(255, (n & 0xff) + 26)
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
}

// ───────────────────────── decorative pieces ─────────────────────────

function BookSpines({ x, y, width, height, seed = 0 }) {
  const palette = ['#D4A24E', '#8B5E3C', '#6FBF73', '#E0675C', '#9CB3A6', '#E8C26B', '#5B7F77', '#C97B63', '#A6C36F']
  const books = []
  let cx = x
  let i = 0
  while (cx < x + width - 3) {
    const w = 5 + ((seed + i * 7) % 7)
    const h = height - ((seed + i * 5) % 7)
    const clampedW = Math.min(w, x + width - cx)
    books.push(
      <rect key={i} x={cx} y={y + (height - h)} width={clampedW} height={h}
            fill={palette[(seed + i) % palette.length]} rx="1" />
    )
    cx += w + 1
    i++
  }
  return <>{books}</>
}

function Bookshelf({ x, y, width, height, rows = 3 }) {
  const rowH = height / rows
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill="#5B3A24" rx="3" />
      {Array.from({ length: rows }).map((_, r) => (
        <g key={r}>
          <BookSpines x={x + 3} y={y + r * rowH + 3} width={width - 6} height={rowH - 6} seed={r * 13 + Math.round(x)} />
          {r < rows - 1 && <rect x={x} y={y + (r + 1) * rowH - 1.5} width={width} height="3" fill="#3F2817" />}
        </g>
      ))}
      <rect x={x} y={y} width={width} height={height} fill="none" stroke="#3F2817" strokeWidth="2" rx="3" />
    </g>
  )
}

function Plant({ x, y, scale = 1 }) {
  return (
    <g transform={`translate(${x},${y}) scale(${scale})`}>
      <path d="M-14 0 L14 0 L10 24 L-10 24 Z" fill="#A9785A" stroke="#7A5236" strokeWidth="1" />
      <ellipse cx="-6" cy="-6" rx="5" ry="16" fill="#5A8F5A" transform="rotate(-24)" />
      <ellipse cx="0" cy="-10" rx="5" ry="18" fill="#6FAE6F" />
      <ellipse cx="6" cy="-6" rx="5" ry="16" fill="#5A8F5A" transform="rotate(24)" />
    </g>
  )
}

function WindowPane({ x, y, width, height }) {
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill="#CFE8F0" stroke="#9CB3A6" strokeWidth="3" rx="3" />
      <line x1={x + width / 2} y1={y} x2={x + width / 2} y2={y + height} stroke="#9CB3A6" strokeWidth="2" />
      <line x1={x} y1={y + height / 2} x2={x + width} y2={y + height / 2} stroke="#9CB3A6" strokeWidth="2" />
    </g>
  )
}

function RoomTag({ x, y, icon, label }) {
  const w = label.length * 7.2 + 40
  return (
    <g>
      <rect x={x} y={y} width={w} height="26" rx="13" fill="#28392F" stroke="#D4A24E" strokeWidth="1.2" />
      <text x={x + 16} y={y + 18} fontSize="14">{icon}</text>
      <text x={x + 34} y={y + 17} fontSize="11.5" fontWeight="700" fill="#F3EFE6" letterSpacing="0.5">{label}</text>
    </g>
  )
}

// ───────────────────────────── main map ──────────────────────────────

export default function LibraryMap({ desks = [], onDeskClick }) {
  const [hovered, setHovered] = useState(null)

  const isClickable = (desk) => desk.status === 'free' || desk.status === 'abandoned'

  return (
    <div className="flex w-full justify-center overflow-hidden">
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="block h-auto w-full min-w-0 max-w-[1040px]"
        aria-label="Library floor plan"
      >
        <defs>
          <pattern id="floorgrain" width="48" height="48" patternUnits="userSpaceOnUse">
            <rect width="48" height="48" fill="#1F2F27" />
            <path d="M0 0 L48 48 M0 48 L48 0" stroke="#152019" strokeWidth="0.6" opacity="0.5" />
          </pattern>
          <style>{`
            @keyframes away-pulse { 0%,100%{opacity:1} 50%{opacity:.55} }
            .desk-away { animation: away-pulse 1.8s ease-in-out infinite; }
            .desk-btn  { cursor: pointer; }
            .desk-btn:hover .desk-body { filter: brightness(1.12); }
          `}</style>
        </defs>

        {/* Floor + outer wall */}
        <rect width={SVG_W} height={SVG_H} rx="16" fill="url(#floorgrain)" />
        <rect x="1.5" y="1.5" width={SVG_W - 3} height={SVG_H - 3} rx="16" fill="none" stroke="#3F2817" strokeWidth="3" />

        {/* Title plaque */}
        <rect x={SVG_W / 2 - 190} y={18} width="380" height="58" rx="8" fill="#3F2817" />
        <text x={SVG_W / 2} y={42} textAnchor="middle" fill="#F3EFE6" fontSize="16" fontWeight="800" letterSpacing="2">
          MUJ CENTRAL LIBRARY
        </text>
        <text x={SVG_W / 2} y={63} textAnchor="middle" fill="#D4A24E" fontSize="10.5" letterSpacing="3">
          LIVE SEAT &amp; DESK MAP
        </text>

        {/* Top bookshelf wall */}
        <Bookshelf x={20} y={90} width={SVG_W - 40} height={36} rows={2} />

        {/* Left bookshelf wall */}
        <Bookshelf x={20} y={140} width={36} height={SVG_H - 200} rows={6} />

        {/* Right windows + plant */}
        <WindowPane x={SVG_W - 86} y={150} width={66} height={120} />
        <WindowPane x={SVG_W - 86} y={290} width={66} height={120} />
        <WindowPane x={SVG_W - 86} y={430} width={66} height={120} />
        <Plant x={SVG_W - 52} y={SVG_H - 130} scale={1.3} />

        {/* Partial-height shelf dividers between zones */}
        <Bookshelf x={258} y={170} width={26} height={340} rows={5} />
        <Bookshelf x={700} y={330} width={26} height={300} rows={5} />

        {/* Zone "rugs" */}
        <rect x={88} y={186} width={172} height={332} rx="24" fill="#28392F" opacity="0.6" />
        <rect x={400} y={196} width={300} height={372} rx="24" fill="#2C3A33" opacity="0.5" />
        <rect x={745} y={196} width={200} height={372} rx="24" fill="#28392F" opacity="0.6" />

        {/* Zone labels */}
        <RoomTag x={92} y={160} icon="📖" label="READING ALCOVE" />
        <RoomTag x={404} y={160} icon="📚" label="LONG TABLE HALL" />
        <RoomTag x={748} y={160} icon="💬" label="GROUP STUDY PODS" />

        {/* Section A — shared reading-table strips */}
        {[0, 1, 2, 3, 4].map(r => (
          <rect key={`a-tbl-${r}`} x={110 + DESK_W} y={215 + r * (DESK_H + 22)} width="18" height={DESK_H} fill="#5B3A24" rx="2" />
        ))}

        {/* Section B — long communal tables */}
        {[0, 1, 2, 3, 4].map(r => (
          <rect key={`b-tbl-${r}`} x={480} y={225 + r * (DESK_H + 34)} width="150" height={DESK_H} fill="#5B3A24" rx="3" />
        ))}

        {/* Section C — round pod tables */}
        {[0, 1, 2, 3, 4].map(r => (
          <circle key={`c-tbl-${r}`} cx={857} cy={225 + r * (DESK_H + 34) + DESK_H / 2} r="27" fill="#5B3A24" stroke="#3F2817" strokeWidth="2" />
        ))}

        {/* Circulation desk */}
        <path d="M 28 600 Q 28 555 73 555 L 210 555 Q 250 555 250 600 L 250 645 L 28 645 Z" fill="#3F2817" stroke="#2A1C10" strokeWidth="2" />
        <text x="139" y="605" textAnchor="middle" fill="#F3EFE6" fontSize="12" fontWeight="700" letterSpacing="2">CIRCULATION</text>
        <text x="139" y="622" textAnchor="middle" fill="#D4A24E" fontSize="10" letterSpacing="3">DESK</text>

        {/* New arrivals display */}
        <rect x="300" y="600" width="90" height="46" rx="4" fill="#5B3A24" />
        <BookSpines x={306} y={606} width={78} height={34} seed={42} />
        <text x="345" y="660" textAnchor="middle" fill="#9CB3A6" fontSize="10">New Arrivals</text>

        {/* Entrance */}
        <rect x={SVG_W / 2 - 58} y={SVG_H - 28} width="116" height="8" fill="#5B3A24" />
        <rect x={SVG_W / 2 - 58} y={SVG_H - 78} width="54" height="50" fill="#CFE3DA" stroke="#5B3A24" strokeWidth="3" rx="2" />
        <rect x={SVG_W / 2 + 4} y={SVG_H - 78} width="54" height="50" fill="#CFE3DA" stroke="#5B3A24" strokeWidth="3" rx="2" />
        <text x={SVG_W / 2} y={SVG_H - 12} textAnchor="middle" fill="#9CB3A6" fontSize="10" letterSpacing="3">ENTRANCE / EXIT</text>

        {/* Plants flanking the entrance */}
        <Plant x={SVG_W / 2 - 110} y={SVG_H - 40} scale={1.1} />
        <Plant x={SVG_W / 2 + 120} y={SVG_H - 40} scale={1.1} />

        {/* ── Desks ── */}
        {desks.map(desk => {
          const { x, y } = getDeskPos(desk.section, desk.row_num, desk.col_num)
          const s = STATUS[desk.status] ?? STATUS.free
          const clickable = isClickable(desk)
          const isHov = hovered === desk.id
          const isAway = desk.status === 'away'

          return (
            <g
              key={desk.id}
              className={[clickable ? 'desk-btn' : '', isAway ? 'desk-away' : ''].filter(Boolean).join(' ')}
              onClick={() => clickable && onDeskClick(desk)}
              onMouseEnter={() => setHovered(desk.id)}
              onMouseLeave={() => setHovered(null)}
              role={clickable ? 'button' : undefined}
              tabIndex={clickable ? 0 : undefined}
              onKeyDown={e => e.key === 'Enter' && clickable && onDeskClick(desk)}
              aria-label={`${desk.id} in ${ROOM_LABEL[desk.section] ?? 'library'} – ${s.label}${desk.student_id ? ` – ${desk.student_id}` : ''}`}
            >
              {/* Drop shadow */}
              <rect x={x + 2} y={y + 3} width={DESK_W} height={DESK_H} rx="6" fill="rgba(0,0,0,0.28)" />

              {/* Desk surface */}
              <rect
                className="desk-body"
                x={x} y={y} width={DESK_W} height={DESK_H}
                rx="6"
                fill={isHov && clickable ? lighten(s.fill) : s.fill}
                stroke={s.stroke}
                strokeWidth={isHov ? 2.5 : 1.5}
              />

              {/* Chair bump */}
              <rect x={x + 10} y={y + DESK_H - 2} width={DESK_W - 20} height={7} rx="3.5" fill={s.stroke} opacity="0.45" />

              {/* Desk ID */}
              <text x={x + DESK_W / 2} y={y + DESK_H / 2 - 3}
                    textAnchor="middle" dominantBaseline="middle"
                    fill="#1B2A23" fontSize="11" fontWeight="800"
                    style={{ pointerEvents: 'none' }}>
                {desk.id}
              </text>

              {/* Status sub-label */}
              <text x={x + DESK_W / 2} y={y + DESK_H / 2 + 10}
                    textAnchor="middle" fill="rgba(27,42,35,0.7)" fontSize="7"
                    style={{ pointerEvents: 'none' }}>
                {s.label.toUpperCase()}
              </text>

              {/* Tooltip on hover */}
              {isHov && (
                <g style={{ pointerEvents: 'none' }}>
                  <rect x={x - 16} y={y - 38} width={DESK_W + 32} height="28" rx="5" fill="#3F2817" stroke="#D4A24E" strokeWidth="1" />
                  <text x={x + DESK_W / 2} y={y - 20} textAnchor="middle" fill="#F3EFE6" fontSize="10">
                    {desk.student_id
                      ? `Roll ${desk.student_id}`
                      : clickable
                        ? 'Click to check in'
                        : s.label}
                  </text>
                </g>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}