/**
 * waitlist.routes.js
 * Mount in server.js: app.use(waitlistRouter)
 *
 * Endpoints:
 *  POST   /api/waitlist/join
 *  DELETE /api/waitlist/leave
 *  GET    /api/waitlist/:desk_id          — queue for a desk
 *  GET    /api/waitlist/student/:id       — all queues a student is in
 *  GET    /api/admin/analytics/heatmap
 *  GET    /api/admin/analytics/sections
 *  GET    /api/admin/analytics/peak-hours
 *  GET    /api/admin/analytics/daily
 */

import express from 'express'
import { createClient } from '@supabase/supabase-js'

const router = express.Router()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function jsonError(res, status, msg) {
  return res.status(status).json({ error: msg })
}

function requireAdmin(req, res, next) {
  if (req.headers['x-admin-token'] !== process.env.ADMIN_TOKEN)
    return jsonError(res, 401, 'Unauthorized')
  next()
}

// ── POST /api/waitlist/join ───────────────────────────────────
// Body: { desk_id, student_id }
router.post('/api/waitlist/join', async (req, res) => {
  try {
    const { desk_id, student_id } = req.body
    if (!desk_id || !student_id) return jsonError(res, 400, 'Missing fields.')

    // Check desk actually exists and is occupied/away (no point queuing for a free desk)
    const { data: desk } = await supabase
      .from('desks').select('status').eq('id', desk_id).single()
    if (!desk) return jsonError(res, 404, 'Desk not found.')
    if (desk.status === 'free') return jsonError(res, 409, 'Desk is already free — check in directly.')

    // Check not already in queue
    const { data: existing } = await supabase
      .from('waitlist')
      .select('id')
      .eq('desk_id', desk_id)
      .eq('student_id', student_id)
      .in('status', ['waiting', 'notified'])
      .maybeSingle()
    if (existing) return jsonError(res, 409, 'Already in queue for this desk.')

    const { data, error } = await supabase
      .from('waitlist')
      .insert({ desk_id, student_id, status: 'waiting' })
      .select()
      .single()
    if (error) throw error

    // Get queue position
    const { count } = await supabase
      .from('waitlist')
      .select('*', { count: 'exact', head: true })
      .eq('desk_id', desk_id)
      .eq('status', 'waiting')
      .lte('joined_at', data.joined_at)

    return res.json({ ok: true, entry: data, position: count })
  } catch (e) {
    console.error('[waitlist/join]', e)
    return jsonError(res, 500, e.message)
  }
})

// ── DELETE /api/waitlist/leave ────────────────────────────────
// Body: { desk_id, student_id }
router.delete('/api/waitlist/leave', async (req, res) => {
  try {
    const { desk_id, student_id } = req.body
    await supabase
      .from('waitlist')
      .update({ status: 'cancelled' })
      .eq('desk_id', desk_id)
      .eq('student_id', student_id)
      .in('status', ['waiting', 'notified'])
    return res.json({ ok: true })
  } catch (e) {
    return jsonError(res, 500, e.message)
  }
})

// ── GET /api/waitlist/:desk_id ────────────────────────────────
router.get('/api/waitlist/:desk_id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('waitlist')
      .select('id, student_id, joined_at, status')
      .eq('desk_id', req.params.desk_id)
      .in('status', ['waiting', 'notified'])
      .order('joined_at')
    if (error) throw error
    return res.json(data)
  } catch (e) {
    return jsonError(res, 500, e.message)
  }
})

// ── GET /api/waitlist/student/:student_id ─────────────────────
router.get('/api/waitlist/student/:student_id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('waitlist')
      .select('id, desk_id, joined_at, status, notified_at, expires_at')
      .eq('student_id', req.params.student_id)
      .in('status', ['waiting', 'notified'])
      .order('joined_at')
    if (error) throw error
    return res.json(data)
  } catch (e) {
    return jsonError(res, 500, e.message)
  }
})

// ── Waitlist notification cron ────────────────────────────────
// Call startWaitlistCron() in server.js alongside startCron().
// When a desk becomes free, notifies the next person in queue.
// They get 10 minutes to claim it before it passes to the next.

export async function notifyNextInQueue(desk_id) {
  // Find next waiting entry
  const { data: next } = await supabase
    .from('waitlist')
    .select('*')
    .eq('desk_id', desk_id)
    .eq('status', 'waiting')
    .order('joined_at')
    .limit(1)
    .maybeSingle()

  if (!next) return   // nobody waiting

  const expires_at = new Date(Date.now() + 10 * 60_000).toISOString()

  await supabase
    .from('waitlist')
    .update({ status: 'notified', notified_at: new Date().toISOString(), expires_at })
    .eq('id', next.id)

  console.log(`[waitlist] Notified ${next.student_id} for desk ${desk_id}`)
}

export function startWaitlistCron() {
  setInterval(async () => {
    try {
      // Expire notified entries whose 10-min window passed
      const now = new Date().toISOString()
      const { data: expired } = await supabase
        .from('waitlist')
        .select('id, desk_id')
        .eq('status', 'notified')
        .lt('expires_at', now)

      for (const entry of expired ?? []) {
        await supabase
          .from('waitlist')
          .update({ status: 'expired' })
          .eq('id', entry.id)

        // Notify next in queue for that desk
        await notifyNextInQueue(entry.desk_id)
      }
    } catch (e) {
      console.error('[waitlist-cron]', e.message)
    }
  }, 30_000)  // every 30 seconds
}

// ── GET /api/admin/analytics/heatmap ─────────────────────────
// Returns booking counts per desk (all time)
router.get('/api/admin/analytics/heatmap', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .select('desk_id, checked_in_at')
      .not('checked_in_at', 'is', null)
    if (error) throw error

    // Aggregate in JS: { desk_id -> count }
    const counts = {}
    for (const s of data) {
      counts[s.desk_id] = (counts[s.desk_id] ?? 0) + 1
    }
    return res.json(counts)
  } catch (e) {
    return jsonError(res, 500, e.message)
  }
})

// ── GET /api/admin/analytics/sections ────────────────────────
router.get('/api/admin/analytics/sections', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('section_analytics')
      .select('*')
    if (error) throw error
    return res.json(data)
  } catch (e) {
    return jsonError(res, 500, e.message)
  }
})

// ── GET /api/admin/analytics/peak-hours ──────────────────────
router.get('/api/admin/analytics/peak-hours', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('peak_hours')
      .select('*')
    if (error) throw error
    return res.json(data)
  } catch (e) {
    return jsonError(res, 500, e.message)
  }
})

// ── GET /api/admin/analytics/daily ───────────────────────────
router.get('/api/admin/analytics/daily', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('daily_summary')
      .select('*')
      .limit(30)
    if (error) throw error
    return res.json(data)
  } catch (e) {
    return jsonError(res, 500, e.message)
  }
})

export default router