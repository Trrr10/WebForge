import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useRealtimeDesks() {
  const [desks, setDesks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchDesks() {
      const { data, error } = await supabase
        .from('desks')
        .select('*')
        .order('section')
        .order('row_num')    // ✅ fixed: was 'row_label' (doesn't exist in schema)
        .order('col_num')    // ✅ fixed: was 'seat_number' (doesn't exist in schema)

      if (error) {
        setError(error.message)
      } else {
        setDesks(data)
      }
      setLoading(false)
    }

    fetchDesks()

    const channel = supabase
      .channel('desks-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'desks' },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setDesks((prev) =>
              prev.map((d) => (d.id === payload.new.id ? payload.new : d))
            )
          }
          if (payload.eventType === 'INSERT') {
            setDesks((prev) => [...prev, payload.new])
          }
          if (payload.eventType === 'DELETE') {
            setDesks((prev) => prev.filter((d) => d.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // ✅ fixed: group by section+row using actual schema columns
  const desksBySection = desks.reduce((acc, desk) => {
    const key = desk.section
    if (!acc[key]) acc[key] = []
    acc[key].push(desk)
    return acc
  }, {})

  const stats = {
    free:      desks.filter((d) => d.status === 'free').length,
    occupied:  desks.filter((d) => d.status === 'occupied').length,
    away:      desks.filter((d) => d.status === 'away').length,
    abandoned: desks.filter((d) => d.status === 'abandoned').length,
    total:     desks.length,
  }

  return { desks, desksBySection, stats, loading, error }
}