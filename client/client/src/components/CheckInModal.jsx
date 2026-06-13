/**
 * CheckInModal.jsx
 * Drop in src/components/CheckInModal.jsx
 *
 * Styled like a library checkout card: cream "index card" on a dark
 * backdrop, mono font for the roll number, brass accent button.
 *
 * BUG FIX: previously called `await res.json()` directly, which throws
 * "Unexpected end of JSON input" whenever the response body is empty
 * (e.g. backend down, a 204, a proxy error page). Now uses postJSON()
 * from src/lib/api.js, which handles empty/invalid bodies gracefully.
 */
import { useState } from 'react'
import { postJSON } from '../lib/api'

export default function CheckInModal({ desk, onClose, onSuccess }) {
  const [studentId, setStudentId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    const id = studentId.trim().toUpperCase()
    if (!id) {
      setError('Enter your roll number.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const data = await postJSON('/api/checkin', { desk_id: desk.id, student_id: id })

      const session = {
        deskId: desk.id,
        studentId: id,
        checkedInAt: data.checked_in_at,
        expiresAt: data.expires_at,
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0e1611]/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl border border-[#D4A24E]/30 bg-[#F3EFE6] p-6 shadow-2xl shadow-black/40
                   before:absolute before:inset-x-6 before:top-0 before:h-px before:bg-[repeating-linear-gradient(90deg,#D4A24E_0_8px,transparent_8px_16px)]"
        onClick={e => e.stopPropagation()}
      >
        <button
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-lg text-[#5B3A24]/60
                     transition hover:bg-[#5B3A24]/10 hover:text-[#5B3A24]"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>

        <div className="mb-1 text-3xl">📚</div>
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#5B3A24]/60">Library Card · Check-In</p>
        <h2 className="mt-1 font-serif text-2xl font-bold text-[#3F2817]">
          Desk {desk.label ?? desk.id}
        </h2>
        <p className="mt-1 text-sm text-[#5B3A24]/80">
          Section {desk.section} &middot; Your session lasts 2 hours.
        </p>

        <div className="my-5 h-px bg-[#5B3A24]/15" />

        <label className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-[#5B3A24]/70">
          Roll number
        </label>
        <input
          className="w-full rounded-lg border border-[#5B3A24]/25 bg-white/70 px-3 py-2.5 font-mono text-base text-[#3F2817]
                     outline-none ring-0 transition focus:border-[#D4A24E] focus:ring-2 focus:ring-[#D4A24E]/40"
          type="text"
          placeholder="e.g. 220101234"
          value={studentId}
          maxLength={20}
          onChange={e => setStudentId(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          autoFocus
        />

        {error && (
          <p className="mt-2 rounded-md bg-[#E0675C]/10 px-3 py-2 text-sm text-[#C1453B]">
            {error}
          </p>
        )}

        <button
          className="mt-5 w-full rounded-lg bg-[#3F2817] py-2.5 font-semibold text-[#F3EFE6] transition
                     hover:bg-[#2A1C10] disabled:cursor-not-allowed disabled:opacity-60"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? 'Stamping card…' : 'Confirm Check-In'}
        </button>
      </div>
    </div>
  )
}