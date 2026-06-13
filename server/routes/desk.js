/**
 * routes/desk.js  (or paste directly into your server.js / index.js)
 *
 * Express routes for DeskGuard.
 * Requires:
 *   npm install express @supabase/supabase-js
 *
 * Env vars needed:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   ← service role, not anon key (bypasses RLS)
 *   ADMIN_TOKEN                 ← any secret string for librarian dashboard
 */

import express from 'express'
import { createClient } from '@supabase/supabase-js'

const router = express.Router()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY   // service role so server can write freely
)

// ─── helpers ───────────────────────────────────────────────────────────────

function addMinutes(date, mins) {
  return new Date(date.getTime() + mins * 60_000).toISOString()
}

function jsonError(res, status, message) {
  return res.status(status).json({ error: message })
}

// ─── POST /api/checkin ─────────────────────────────────────────────────────
// Body: { desk_id: "B2", student_id: "220101234" }
// Returns: { ok: true, desk_id, student_id, checked_in_at, expires_at }

router.post('/api/checkin', async (req, res) => {
  try {
    const { desk_id, student_id } = req.body

    if (!desk_id || !student_id) {
      return jsonError(res, 400, 'desk_id and student_id are required.')
    }

    // 1. Fetch the desk
    const { data: desk, error: fetchErr } = await supabase
      .from('desks')
      .select('*')
      .eq('id', desk_id)
      .single()

    if (fetchErr || !desk) {
      return jsonError(res, 404, `Desk ${desk_id} not found.`)
    }

    if (desk.status !== 'free' && desk.status !== 'abandoned') {
      return jsonError(res, 409, `Desk ${desk_id} is currently ${desk.status}.`)
    }

    const now         = new Date()
    const checked_in_at = now.toISOString()
    const expires_at  = addMinutes(now, 120)   // 2-hour session

    // 2. Update desk
    const { error: updateErr } = await supabase
      .from('desks')
      .update({
        status:        'occupied',
        student_id,
        checked_in_at,
        expires_at,
        away_at:       null,
      })
      .eq('id', desk_id)

    if (updateErr) throw updateErr

    // 3. Insert session audit row
    const { error: sessionErr } = await supabase
      .from('sessions')
      .insert({
        desk_id,
        student_id,
        checked_in_at,
      })

    if (sessionErr) throw sessionErr

    return res.json({ ok: true, desk_id, student_id, checked_in_at, expires_at })

  } catch (err) {
    console.error('[checkin]', err)
    return jsonError(res, 500, err.message || 'Internal server error.')
  }
})

// ─── POST /api/away ────────────────────────────────────────────────────────
// Body: { desk_id, student_id }
// Pauses session for 20 min

router.post('/api/away', async (req, res) => {
  try {
    const { desk_id, student_id } = req.body
    if (!desk_id || !student_id) return jsonError(res, 400, 'Missing fields.')

    const now      = new Date()
    const away_at  = now.toISOString()
    const expires_at = addMinutes(now, 20)    // away timer: 20 min

    const { error } = await supabase
      .from('desks')
      .update({ status: 'away', away_at, expires_at })
      .eq('id', desk_id)
      .eq('student_id', student_id)

    if (error) throw error

    return res.json({ ok: true, away_at, expires_at })
  } catch (err) {
    console.error('[away]', err)
    return jsonError(res, 500, err.message)
  }
})

// ─── POST /api/checkout ────────────────────────────────────────────────────
// Body: { desk_id, student_id }

router.post('/api/checkout', async (req, res) => {
  try {
    const { desk_id, student_id } = req.body
    if (!desk_id || !student_id) return jsonError(res, 400, 'Missing fields.')

    // Fetch session to compute duration
    const { data: desk } = await supabase
      .from('desks')
      .select('checked_in_at')
      .eq('id', desk_id)
      .single()

    const checked_out_at = new Date().toISOString()
    const duration_mins  = desk?.checked_in_at
      ? Math.round((Date.now() - new Date(desk.checked_in_at)) / 60_000)
      : null

    // Free the desk
    await supabase
      .from('desks')
      .update({
        status:        'free',
        student_id:    null,
        checked_in_at: null,
        away_at:       null,
        expires_at:    null,
      })
      .eq('id', desk_id)

    // Close the session row
    await supabase
      .from('sessions')
      .update({ checked_out_at, duration_mins, end_reason: 'checkout' })
      .eq('desk_id', desk_id)
      .eq('student_id', student_id)
      .is('checked_out_at', null)

    return res.json({ ok: true, duration_mins })
  } catch (err) {
    console.error('[checkout]', err)
    return jsonError(res, 500, err.message)
  }
})

// ─── POST /api/extend ─────────────────────────────────────────────────────
// Body: { desk_id, student_id }
// Called when user taps "Yes, I'm here!" on the Still Here prompt
// Resets the 2-hour session clock from now

router.post('/api/extend', async (req, res) => {
  try {
    const { desk_id, student_id } = req.body
    if (!desk_id || !student_id) return jsonError(res, 400, 'Missing fields.')

    const now        = new Date()
    const expires_at = addMinutes(now, 120)

    const { error } = await supabase
      .from('desks')
      .update({ status: 'occupied', expires_at, away_at: null })
      .eq('id', desk_id)
      .eq('student_id', student_id)

    if (error) throw error

    return res.json({ ok: true, expires_at })
  } catch (err) {
    console.error('[extend]', err)
    return jsonError(res, 500, err.message)
  }
})

// ─── Admin middleware ──────────────────────────────────────────────────────

function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token']
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return jsonError(res, 401, 'Unauthorized.')
  }
  next()
}

// ─── GET /api/admin/desks ──────────────────────────────────────────────────

router.get('/api/admin/desks', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('desks')
      .select('*')
      .order('section')
      .order('row_num')
      .order('col_num')
    if (error) throw error
    return res.json(data)
  } catch (err) {
    return jsonError(res, 500, err.message)
  }
})

// ─── GET /api/admin/sessions ───────────────────────────────────────────────

router.get('/api/admin/sessions', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .order('checked_in_at', { ascending: false })
      .limit(200)
    if (error) throw error
    return res.json(data)
  } catch (err) {
    return jsonError(res, 500, err.message)
  }
})

// ─── GET /api/admin/stats ─────────────────────────────────────────────────

router.get('/api/admin/stats', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase.from('desks').select('status')
    if (error) throw error
    const count = (s) => data.filter(d => d.status === s).length
    return res.json({
      free:      count('free'),
      occupied:  count('occupied'),
      away:      count('away'),
      abandoned: count('abandoned'),
      total:     data.length,
    })
  } catch (err) {
    return jsonError(res, 500, err.message)
  }
})

// ─── POST /api/admin/reset/:id ────────────────────────────────────────────

router.post('/api/admin/reset/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params

    await supabase
      .from('sessions')
      .update({ checked_out_at: new Date().toISOString(), end_reason: 'admin_reset' })
      .eq('desk_id', id)
      .is('checked_out_at', null)

    await supabase
      .from('desks')
      .update({
        status: 'free', student_id: null,
        checked_in_at: null, away_at: null, expires_at: null,
      })
      .eq('id', id)

    return res.json({ ok: true })
  } catch (err) {
    return jsonError(res, 500, err.message)
  }
})

// ─── POST /api/admin/reset-all ────────────────────────────────────────────

router.post('/api/admin/reset-all', requireAdmin, async (req, res) => {
  try {
    const { data: abandoned } = await supabase
      .from('desks')
      .select('id')
      .eq('status', 'abandoned')

    for (const d of abandoned ?? []) {
      await supabase
        .from('sessions')
        .update({ checked_out_at: new Date().toISOString(), end_reason: 'admin_reset' })
        .eq('desk_id', d.id)
        .is('checked_out_at', null)
    }

    await supabase
      .from('desks')
      .update({
        status: 'free', student_id: null,
        checked_in_at: null, away_at: null, expires_at: null,
      })
      .eq('status', 'abandoned')

    return res.json({ ok: true, count: abandoned?.length ?? 0 })
  } catch (err) {
    return jsonError(res, 500, err.message)
  }
})

// ─── Background cron: auto-expire desks ───────────────────────────────────
// Call startCron() once in your server entry point.
// Sweeps every 60s and marks expired desks as 'abandoned'.

export function startCron() {
  setInterval(async () => {
    const now = new Date().toISOString()
    try {
      // Occupied desks past their expires_at → abandoned
      const { data: expired } = await supabase
        .from('desks')
        .select('id')
        .in('status', ['occupied', 'away'])
        .lt('expires_at', now)

      for (const d of expired ?? []) {
        await supabase
          .from('desks')
          .update({ status: 'abandoned' })
          .eq('id', d.id)

        await supabase
          .from('sessions')
          .update({
            checked_out_at: now,
            end_reason: 'expired',
            duration_mins: null,
          })
          .eq('desk_id', d.id)
          .is('checked_out_at', null)
      }

      if (expired?.length) {
        console.log(`[cron] Expired ${expired.length} desk(s)`)
      }
    } catch (err) {
      console.error('[cron] Error:', err.message)
    }
  }, 60_000)   // every 60 seconds
}

export default router