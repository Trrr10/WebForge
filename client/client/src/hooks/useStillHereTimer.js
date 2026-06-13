import { useEffect, useState } from 'react'

// Fires showPrompt at 1h50m, gives 10 min to confirm before auto-expiry by cron
export function useStillHereTimer(checkedInAt) {
  const [showPrompt, setShowPrompt] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(null)

  useEffect(() => {
    if (!checkedInAt) {
      setShowPrompt(false)
      setSecondsLeft(null)
      return
    }

    const PROMPT_AFTER_MS = 110 * 60 * 1000  // 1h 50m
    const EXPIRE_AFTER_MS = 120 * 60 * 1000  // 2h (cron will expire at this point)

    const interval = setInterval(() => {
      const elapsed = Date.now() - new Date(checkedInAt).getTime()

      if (elapsed >= PROMPT_AFTER_MS) {
        setShowPrompt(true)
        const remaining = Math.max(0, Math.ceil((EXPIRE_AFTER_MS - elapsed) / 1000))
        setSecondsLeft(remaining)
      }

      if (elapsed >= EXPIRE_AFTER_MS) {
        clearInterval(interval)
        setShowPrompt(false)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [checkedInAt])

  return { showPrompt, secondsLeft, dismissPrompt: () => setShowPrompt(false) }
}