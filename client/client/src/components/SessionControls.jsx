/**
 * SessionControls.jsx
 * Drop in src/components/SessionControls.jsx
 *
 * Active-session banner styled as a "due date" card: countdown timer,
 * "I'm Away" pause, "Check Out", and a "Still here?" prompt at 1h50m.
 *
 * BUG FIX: previously called `await fetch(...).then(r => r.json())`-style
 * parsing with no guard, which throws "Unexpected end of JSON input" on an
 * empty response body. Now uses postJSON() from src/lib/api.js.
 */
import { useState, useEffect } from 'react'
import { postJSON } from '../lib/api'

function useCountdown(targetIso) {
  const [secs, setSecs] = useState(0)

  useEffect(() => {
    if (!targetIso) return
    const tick = () => {
      const diff = Math.max(0, Math.floor((new Date(targetIso) - Date.now()) / 1000))
      setSecs(diff)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [targetIso])

  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function SessionControls({ session, onCheckout }) {
  const countdown = useCountdown(session.expiresAt)
  const [loading, setLoading] = useState(null) // 'away' | 'checkout' | 'stillhere'
  const [isAway, setIsAway] = useState(false)
  const [showStillHere, setShowStillHere] = useState(false)
  const [error, setError] = useState('')

  // Fire "Still Here?" prompt at 1h 50m
  useEffect(() => {
    if (!session.checkedInAt) return
    const PROMPT_MS = 110 * 60 * 1000
    const elapsed = Date.now() - new Date(session.checkedInAt).getTime()
    const delay = Math.max(0, PROMPT_MS - elapsed)
    const id = setTimeout(() => setShowStillHere(true), delay)
    return () => clearTimeout(id)
  }, [session.checkedInAt])

  async function handleAway() {
    setLoading('away')
    setError('')
    try {
      await postJSON('/api/away', { desk_id: session.deskId, student_id: session.studentId })
      setIsAway(true)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(null)
    }
  }

  async function handleCheckout() {
    setLoading('checkout')
    setError('')
    try {
      await postJSON('/api/checkout', { desk_id: session.deskId, student_id: session.studentId })
      localStorage.removeItem('deskguard_session')
      onCheckout()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(null)
    }
  }

  async function handleStillHere() {
    setLoading('stillhere')
    setError('')
    try {
      await postJSON('/api/extend', { desk_id: session.deskId, student_id: session.studentId })
      setShowStillHere(false)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(null)
    }
  }

  return (
    <>
      {/* "Still Here?" overlay */}
      {showStillHere && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0e1611]/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-[#D4A24E]/30 bg-[#F3EFE6] p-6 text-center shadow-2xl">
            <div className="text-3xl">⏰</div>
            <h2 className="mt-2 font-serif text-2xl font-bold text-[#3F2817]">Still here?</h2>
            <p className="mt-2 text-sm text-[#5B3A24]/80">
              Your session at <span className="font-mono font-semibold">{session.deskId}</span> is about to expire.
              Confirm to extend by 10 minutes.
            </p>

            {error && (
              <p className="mt-3 rounded-md bg-[#E0675C]/10 px-3 py-2 text-sm text-[#C1453B]">{error}</p>
            )}

            <button
              className="mt-4 w-full rounded-lg bg-[#3F2817] py-2.5 font-semibold text-[#F3EFE6] transition
                         hover:bg-[#2A1C10] disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleStillHere}
              disabled={loading === 'stillhere'}
            >
              {loading === 'stillhere' ? 'Extending…' : "Yes, I'm here!"}
            </button>
            <button
              className="mt-2 w-full rounded-lg border border-[#5B3A24]/25 py-2.5 font-semibold text-[#3F2817] transition hover:bg-[#5B3A24]/5"
              onClick={handleCheckout}
            >
              Check out now
            </button>
          </div>
        </div>
      )}

      {/* Session banner */}
      <div className="mb-5 flex flex-col gap-4 rounded-2xl border border-[#D4A24E]/25 bg-[#28392F] p-4 shadow-lg shadow-black/20 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-lg bg-[#D4A24E]/15 px-3 py-1.5 font-mono text-sm font-semibold text-[#D4A24E]">
            📍 Desk {session.deskId}
          </span>
          <span className="font-mono text-sm text-[#F3EFE6]/80">Roll: {session.studentId}</span>
          {isAway && (
            <span className="rounded-full bg-[#E8C26B]/15 px-2.5 py-1 text-xs font-semibold text-[#E8C26B]">
              🟡 Away
            </span>
          )}
        </div>

        <div className="flex flex-col items-center">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#9CB3A6]">Time left</span>
          <span className="font-mono text-xl font-bold text-[#F3EFE6]">{countdown}</span>
        </div>

        <div className="flex gap-2">
          {!isAway && (
            <button
              className="rounded-lg border border-[#9CB3A6]/30 px-4 py-2 text-sm font-semibold text-[#F3EFE6] transition
                         hover:bg-[#9CB3A6]/10 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleAway}
              disabled={!!loading}
            >
              {loading === 'away' ? '…' : "I'm Away"}
            </button>
          )}
          <button
            className="rounded-lg bg-[#E0675C] px-4 py-2 text-sm font-semibold text-[#1B2A23] transition
                       hover:bg-[#c1453b] disabled:cursor-not-allowed disabled:opacity-60"
            onClick={handleCheckout}
            disabled={!!loading}
          >
            {loading === 'checkout' ? 'Checking out…' : 'Check Out'}
          </button>
        </div>

        {error && (
          <p className="basis-full rounded-md bg-[#E0675C]/10 px-3 py-2 text-sm text-[#E0675C]">{error}</p>
        )}
      </div>
    </>
  )
}