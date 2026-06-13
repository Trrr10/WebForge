/**
 * DeskHeatmap.jsx  —  src/components/admin/DeskHeatmap.jsx
 *
 * SVG heatmap showing all 30 desks coloured by booking frequency.
 * Cold (few bookings) = light amber, Hot (many bookings) = deep red.
 * Laid out identically to LibraryMap so librarians recognise positions.
 */

const DESK_W = 46
const DESK_H = 36
const COL_GAP = 12
const ROW_GAP = 10
const SECTION_GAP = 50
const PADDING = 32
const TOP = 80
const ROWS = 5

const SECTION_X = {
  A: PADDING,
  B: PADDING + (DESK_W * 2 + COL_GAP) + SECTION_GAP,
  C: PADDING + (DESK_W * 2 + COL_GAP) * 2 + SECTION_GAP * 2,
}
const W = PADDING * 2 + (DESK_W * 2 + COL_GAP) * 3 + SECTION_GAP * 2
const H = TOP + ROWS * (DESK_H + ROW_GAP) - ROW_GAP + PADDING * 2 + 24

// Colour ramp: 0 bookings → light cream, max → deep red
function heatColor(value, max) {
  if (max === 0) return { bg: '#F1EFE8', text: '#888780' }
  const t = value / max  // 0 to 1
  // Interpolate through amber → orange → red
  const stops = [
    [0.00, '#FAEEDA', '#633806'],  // amber 50, text amber 800
    [0.33, '#FAC775', '#412402'],  // amber 100
    [0.66, '#EF9F27', '#412402'],  // amber 400
    [0.85, '#D85A30', '#4A1B0C'],  // coral 400
    [1.00, '#A32D2D', '#FCEBEB'],  // red 600, light text
  ]
  let lo = stops[0], hi = stops[stops.length - 1]
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i][0] && t <= stops[i + 1][0]) { lo = stops[i]; hi = stops[i + 1]; break }
  }
  return { bg: lo[1], text: lo[2] }  // simplified: use lo stop colour
}

export default function DeskHeatmap({ desks = [], heatData = {} }) {
  const values  = Object.values(heatData)
  const maxVal  = values.length ? Math.max(...values) : 0
  const totalBookings = values.reduce((a, b) => a + b, 0)

  return (
    <div style={{ width: '100%' }}>
      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: 'rgba(70,40,15,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Booking frequency
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          {['#FAEEDA','#FAC775','#EF9F27','#D85A30','#A32D2D'].map((c, i) => (
            <div key={i} style={{ width: 20, height: 12, background: c, borderRadius: 2 }} />
          ))}
        </div>
        <span style={{ fontSize: 11, color: 'rgba(70,40,15,0.5)' }}>Low → High</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'rgba(70,40,15,0.6)' }}>
          {totalBookings} total bookings
        </span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%"
             style={{ maxWidth: W, display: 'block', fontFamily: 'inherit' }}>

          {/* Section labels */}
          {['A','B','C'].map(sec => {
            const cx = SECTION_X[sec] + DESK_W + COL_GAP / 2
            return (
              <text key={sec} x={cx} y={TOP - 12} textAnchor="middle"
                    fontSize="11" fontWeight="600" fill="rgba(70,40,15,0.5)"
                    letterSpacing="1.5" style={{ textTransform: 'uppercase' }}>
                Section {sec}
              </text>
            )
          })}

          {/* Aisle markers */}
          {[0, 1].map(i => {
            const sec = ['A','B'][i]
            const x = SECTION_X[sec] + DESK_W * 2 + COL_GAP + SECTION_GAP / 2
            return (
              <line key={i} x1={x} y1={TOP - 4} x2={x}
                    y2={TOP + ROWS * (DESK_H + ROW_GAP)}
                    stroke="rgba(80,50,20,0.08)" strokeWidth="1" strokeDasharray="4 4" />
            )
          })}

          {/* Desks */}
          {desks.map(desk => {
            const sx = SECTION_X[desk.section]
            const x  = sx + (desk.col_num - 1) * (DESK_W + COL_GAP)
            const y  = TOP + (desk.row_num - 1) * (DESK_H + ROW_GAP)
            const count  = heatData[desk.id] ?? 0
            const { bg, text } = heatColor(count, maxVal)

            return (
              <g key={desk.id}>
                {/* Shadow */}
                <rect x={x+2} y={y+2} width={DESK_W} height={DESK_H} rx="5" fill="rgba(0,0,0,0.06)" />
                {/* Desk body */}
                <rect x={x} y={y} width={DESK_W} height={DESK_H} rx="5"
                      fill={bg} stroke="rgba(80,50,20,0.12)" strokeWidth="1" />
                {/* Desk ID */}
                <text x={x + DESK_W / 2} y={y + DESK_H / 2 - 4}
                      textAnchor="middle" fontSize="10" fontWeight="700" fill={text}
                      style={{ pointerEvents: 'none' }}>
                  {desk.id}
                </text>
                {/* Count */}
                <text x={x + DESK_W / 2} y={y + DESK_H / 2 + 9}
                      textAnchor="middle" fontSize="9" fill={text} opacity="0.8"
                      style={{ pointerEvents: 'none' }}>
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