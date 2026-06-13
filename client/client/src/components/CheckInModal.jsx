/**
 * CheckInModal.jsx  —  src/components/CheckInModal.jsx
 * Logic unchanged. Fonts use inline styles so they don't depend on
 * tailwind.config.js having fontFamily entries set up.
 */
import { useState } from 'react'
import { postJSON } from '../lib/api'

export default function CheckInModal({ desk, onClose, onSuccess }) {
  const [studentId, setStudentId] = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  async function handleSubmit() {
    const id = studentId.trim().toUpperCase()
    if (!id) { setError('Enter your roll number.'); return }
    setLoading(true)
    setError('')
    try {
      const data = await postJSON('/api/checkin', { desk_id: desk.id, student_id: id })
      const session = {
        deskId:      desk.id,
        studentId:   id,
        checkedInAt: data.checked_in_at,
        expiresAt:   data.expires_at,
      }
      localStorage.setItem('deskguard_session', JSON.stringify(session))
      onSuccess(session)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Load fonts reliably — not via Tailwind config */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Lora:wght@500;600&display=swap"
      />

      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(17,26,19,0.82)' }}
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-sm overflow-hidden rounded-2xl border"
          style={{ background: '#F6F1E8', borderColor: 'rgba(80,50,20,0.14)' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Close */}
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full
                       border-none text-sm transition"
            style={{
              background: 'rgba(80,50,20,0.08)',
              color: 'rgba(70,40,15,0.45)',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>

          {/* Tape strip accent */}
          <div
            className="h-1.5 w-full"
            style={{
              background: 'repeating-linear-gradient(90deg,#c8a96e 0 6px,transparent 6px 12px)',
              opacity: 0.5,
            }}
          />

          {/* Header */}
          <div
            className="px-5 py-5"
            style={{ borderBottom: '1px solid rgba(80,50,20,0.1)' }}
          >
            <div className="mb-2.5 flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full flex-shrink-0"
                style={{ background: '#3a7c36' }}
              />
              <span
                className="text-[10px] uppercase tracking-[0.18em]"
                style={{ color: 'rgba(70,40,15,0.5)', fontFamily: "'DM Mono', monospace" }}
              >
                Library card · Check-in
              </span>
            </div>

            <h2
              className="mb-1 text-[24px] leading-tight"
              style={{
                fontFamily: "'Lora', Georgia, serif",
                fontWeight: 600,
                color: '#1e0f05',
              }}
            >
              Desk {desk.label ?? desk.id}
            </h2>
            <p
              className="text-[12px] tracking-[0.04em]"
              style={{ color: 'rgba(70,40,15,0.52)' }}
            >
              Section {desk.section}
            </p>
          </div>

          {/* Body */}
          <div className="px-5 pb-6 pt-5">
            {/* Info pills */}
            <div className="mb-5 grid grid-cols-2 gap-2.5">
              {[
                { label: 'Duration',   value: '2 hours' },
                { label: 'Away pause', value: '20 min'  },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded-lg px-3 py-2.5"
                  style={{
                    background: '#EDE8DD',
                    border: '1px solid rgba(80,50,20,0.1)',
                  }}
                >
                  <p
                    className="mb-1 text-[9px] uppercase tracking-[0.16em]"
                    style={{ color: 'rgba(70,40,15,0.45)' }}
                  >
                    {label}
                  </p>
                  <p className="text-[14px] font-medium" style={{ color: '#2a1506' }}>
                    {value}
                  </p>
                </div>
              ))}
            </div>

            {/* Roll number field */}
            <label
              className="mb-1.5 block text-[10px] uppercase tracking-[0.14em]"
              style={{ color: 'rgba(70,40,15,0.5)', fontFamily: "'DM Mono', monospace" }}
            >
              Roll number
            </label>
            <input
              type="text"
              placeholder="e.g. 220101234"
              value={studentId}
              maxLength={20}
              autoFocus
              onChange={e => setStudentId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              className="w-full rounded-lg px-3 py-2.5 text-[14px] outline-none transition"
              style={{
                background: 'rgba(255,255,255,0.75)',
                border: '1px solid rgba(80,50,20,0.2)',
                color: '#1e0f05',
                fontFamily: "'DM Mono', monospace",
              }}
              onFocus={e => {
                e.target.style.borderColor = '#8B5E3C'
                e.target.style.boxShadow = '0 0 0 3px rgba(139,94,60,0.14)'
              }}
              onBlur={e => {
                e.target.style.borderColor = 'rgba(80,50,20,0.2)'
                e.target.style.boxShadow = 'none'
              }}
            />

            {error && (
              <p
                className="mt-2.5 rounded-lg px-3 py-2 text-[13px]"
                style={{
                  background: '#FCEBEB',
                  border: '1px solid rgba(163,45,45,0.2)',
                  color: '#791F1F',
                }}
              >
                {error}
              </p>
            )}

            <div
              className="my-4 h-px"
              style={{ background: 'rgba(80,50,20,0.1)' }}
            />

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full rounded-lg py-3 text-[13px] font-medium tracking-[0.06em] transition
                         disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                background: '#1e0f05',
                color: '#F6F1E8',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
              }}
              onMouseEnter={e => { if (!loading) e.target.style.background = '#100800' }}
              onMouseLeave={e => { e.target.style.background = '#1e0f05' }}
            >
              {loading ? 'Stamping card…' : 'Confirm check-in'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}