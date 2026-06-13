import { useState, useEffect } from 'react'
import LibraryMap from '../components/LibraryMap'
import CheckInModal from '../components/CheckInModal'
import SessionControls from '../components/SessionControls'
import { useRealtimeDesks } from '../hooks/useRealtimeDesks'
import { STATUS } from '../lib/theme'

export default function HomePage() {
  const { desks, loading, error, stats } = useRealtimeDesks()
  const [selectedDesk, setSelectedDesk] = useState(null)
  const [session, setSession] = useState(null)

  // Restore session from localStorage on mount
  useEffect(() => {
    const raw = localStorage.getItem('deskguard_session')
    if (raw) {
      try {
        const s = JSON.parse(raw)
        if (new Date(s.expiresAt) > new Date()) {
          setSession(s)
        } else {
          localStorage.removeItem('deskguard_session')
        }
      } catch {
        localStorage.removeItem('deskguard_session')
      }
    }
  }, [])

  function handleDeskClick(desk) {
    if (desk.status === 'free' || desk.status === 'abandoned') {
      setSelectedDesk(desk)
    }
  }

  function handleCheckInSuccess(newSession) {
    setSession(newSession)
    setSelectedDesk(null)
  }

  function handleCheckout() {
    setSession(null)
  }

  const statPills = [
    { key: 'free', label: 'Free', val: stats.free },
    { key: 'occupied', label: 'Occupied', val: stats.occupied },
    { key: 'away', label: 'Away', val: stats.away },
    { key: 'abandoned', label: 'Abandoned', val: stats.abandoned },
  ]

  return (
    <div className="min-h-screen bg-[#152019] text-[#F3EFE6]">
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 border-b border-[#D4A24E]/15 bg-[#152019]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#3F2817] font-serif text-lg font-bold text-[#D4A24E]">
              DG
            </div>
            <div>
              <h1 className="font-serif text-xl font-bold leading-tight">DeskGuard</h1>
              <p className="text-xs uppercase tracking-[0.2em] text-[#9CB3A6]">Library Seat Booking</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-[#6FBF73]/30 bg-[#6FBF73]/10 px-3 py-1.5 text-xs font-semibold text-[#6FBF73]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#6FBF73] opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#6FBF73]" />
              </span>
              LIVE
            </div>
            <a
              href="/admin"
              className="rounded-full border border-[#D4A24E]/30 px-4 py-1.5 text-sm font-semibold text-[#D4A24E] transition hover:bg-[#D4A24E]/10"
            >
              Librarian →
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1500px] px-5 py-8">
        {/* ── Hero ── */}
<section className="relative mb-8 overflow-hidden rounded-4xl border border-[#D4A24E]/15 bg-[#1F2F27] px-6 py-12">

  <p className="text-center font-mono text-xs uppercase tracking-[0.3em] text-[#D4A24E]">
    NO MORE BAG-SQUATTING
  </p>

  <h2 className="mx-auto mt-4 max-w-5xl text-center font-serif text-5xl font-bold leading-tight">
    Find a real seat in the library — checked in, timed, and fair for everyone.
  </h2>

  <p className="mx-auto mt-5 max-w-5xl text-center text-[#9CB3A6]">
    Tap a free desk on the floor plan below, scan in with your roll number, and the seat is yours for two hours.
  </p>

</section>

        {/* ── Session panel ── */}
        {session && <SessionControls session={session} onCheckout={handleCheckout} />}

        {/* ── Stat pills ── */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {statPills.map(s => {
            const tone = STATUS[s.key]
            return (
              <div
                key={s.key}
                className="rounded-2xl border border-[#D4A24E]/10 bg-[#1F2F27] p-4 text-center"
              >
                <span className="block font-serif text-3xl font-bold" style={{ color: tone.fill }}>
                  {s.val}
                </span>
                <span className="mt-1 block text-xs uppercase tracking-widest text-[#9CB3A6]">
                  {s.label}
                </span>
              </div>
            )
          })}
        </div>

        {/* ── Floor plan ── */}
        <section className="min-w-0 rounded-3xl border border-[#D4A24E]/15 bg-[#1F2F27] p-4 sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-serif text-2xl font-bold">Floor Plan</h3>
              <p className="text-sm text-[#9CB3A6]">
                Click a <span className="font-semibold" style={{ color: STATUS.free.fill }}>green</span> desk to check in.
              </p>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3">
              {Object.entries(STATUS).map(([key, s]) => (
                <span key={key} className="flex items-center gap-1.5 text-xs text-[#9CB3A6]">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.fill }} />
                  {s.label}
                </span>
              ))}
            </div>
          </div>

          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 py-24 text-[#9CB3A6]">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#D4A24E]/30 border-t-[#D4A24E]" />
              <p>Loading floor plan…</p>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-[#E0675C]/30 bg-[#E0675C]/10 px-4 py-3 text-sm text-[#E0675C]">
              Failed to load desks: {error}
            </div>
          )}

          {!loading && !error && (
            <LibraryMap desks={desks} onDeskClick={handleDeskClick} />
          )}
        </section>

        {/* ── How it works ── */}
        <section className="mt-8 rounded-3xl border border-[#D4A24E]/15 bg-[#1F2F27] p-6 sm:p-8">
          <h3 className="font-serif text-2xl font-bold">How it works</h3>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { num: '1', text: <>Click any <strong>green</strong> desk on the map to check in with your roll number.</> },
              { num: '2', text: <>Your session lasts <strong>2 hours</strong>. Hit "I'm Away" for a 20-minute pause.</> },
              { num: '3', text: <>When done, press <strong>Check Out</strong> so the next student can use it.</> },
              { num: '4', text: <>Unresponded sessions are auto-expired every minute and shown as <strong>Abandoned</strong>.</> },
            ].map(step => (
              <div key={step.num} className="rounded-2xl border border-[#D4A24E]/10 bg-[#28392F] p-4">
                <span className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#D4A24E]/15 font-mono text-sm font-bold text-[#D4A24E]">
                  {step.num}
                </span>
                <p className="text-sm leading-relaxed text-[#F3EFE6]/90">{step.text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* ── Check-in modal ── */}
      {selectedDesk && (
        <CheckInModal
          desk={selectedDesk}
          onClose={() => setSelectedDesk(null)}
          onSuccess={handleCheckInSuccess}
        />
      )}
    </div>
  )
}