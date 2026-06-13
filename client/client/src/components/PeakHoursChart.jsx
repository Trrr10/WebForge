/**
 * PeakHoursChart.jsx  —  src/components/admin/PeakHoursChart.jsx
 *
 * A 7×24 grid heatmap showing peak booking hours by day of week.
 * Each cell is coloured by booking volume. No external chart library needed.
 */

const DAYS  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const HOURS = Array.from({ length: 17 }, (_, i) => i + 6)  // 6am to 10pm

function cellColor(value, max) {
  if (!value || max === 0) return 'rgba(80,50,20,0.04)'
  const t = value / max
  if (t < 0.2)  return '#FAEEDA'
  if (t < 0.4)  return '#FAC775'
  if (t < 0.6)  return '#EF9F27'
  if (t < 0.8)  return '#D85A30'
  return '#A32D2D'
}

function cellTextColor(value, max) {
  if (!value || max === 0) return 'rgba(80,50,20,0.25)'
  const t = value / max
  return t >= 0.6 ? 'rgba(255,255,255,0.9)' : 'rgba(70,40,15,0.7)'
}

export default function PeakHoursChart({ data = [] }) {
  // Build lookup: [day][hour] → count
  const grid = {}
  for (const row of data) {
    if (!grid[row.day_of_week]) grid[row.day_of_week] = {}
    grid[row.day_of_week][row.hour_of_day] = row.booking_count
  }

  const allValues = data.map(r => r.booking_count)
  const maxVal    = allValues.length ? Math.max(...allValues) : 0

  const CELL_W = 36
  const CELL_H = 28
  const GAP    = 3
  const LEFT   = 36   // space for day labels
  const TOP    = 28   // space for hour labels

  const svgW   = LEFT + HOURS.length * (CELL_W + GAP)
  const svgH   = TOP  + DAYS.length  * (CELL_H + GAP) + 16

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${svgW} ${svgH}`} width="100%"
           style={{ maxWidth: svgW, display: 'block', fontFamily: 'inherit' }}>

        {/* Hour labels */}
        {HOURS.map((h, hi) => (
          <text key={h}
                x={LEFT + hi * (CELL_W + GAP) + CELL_W / 2}
                y={TOP - 8}
                textAnchor="middle" fontSize="9" fill="rgba(70,40,15,0.45)">
            {h % 12 || 12}{h < 12 ? 'a' : 'p'}
          </text>
        ))}

        {/* Day labels + cells */}
        {DAYS.map((day, di) => (
          <g key={day}>
            <text
              x={LEFT - 6}
              y={TOP + di * (CELL_H + GAP) + CELL_H / 2 + 4}
              textAnchor="end" fontSize="10" fill="rgba(70,40,15,0.55)" fontWeight="500">
              {day}
            </text>
            {HOURS.map((h, hi) => {
              const val = grid[di]?.[h] ?? 0
              return (
                <rect key={h}
                      x={LEFT + hi * (CELL_W + GAP)}
                      y={TOP  + di * (CELL_H + GAP)}
                      width={CELL_W} height={CELL_H} rx="3"
                      fill={cellColor(val, maxVal)}
                />
              )
            })}
            {/* Count label — only show if cell is large enough */}
            {HOURS.map((h, hi) => {
              const val = grid[di]?.[h] ?? 0
              if (!val) return null
              return (
                <text key={h}
                      x={LEFT + hi * (CELL_W + GAP) + CELL_W / 2}
                      y={TOP  + di * (CELL_H + GAP) + CELL_H / 2 + 4}
                      textAnchor="middle" fontSize="9"
                      fill={cellTextColor(val, maxVal)}>
                  {val}
                </text>
              )
            })}
          </g>
        ))}

        {/* Legend */}
        {['#FAEEDA','#FAC775','#EF9F27','#D85A30','#A32D2D'].map((c, i) => (
          <rect key={i}
                x={LEFT + i * 18}
                y={svgH - 12}
                width={14} height={8} rx="2" fill={c} />
        ))}
        <text x={LEFT + 5 * 18 + 4} y={svgH - 5}
              fontSize="9" fill="rgba(70,40,15,0.4)">
          Low → High
        </text>
      </svg>
    </div>
  )
}