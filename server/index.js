/**
 * server.js  — DeskGuard backend entry point
 *
 * Run:  node server.js
 * Dev:  npx nodemon server.js
 *
 * Required env vars (put in .env):
 *   PORT=3001
 *   SUPABASE_URL=https://xxxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ...
 *   ADMIN_TOKEN=any-secret-string
 *   FRONTEND_URL=http://localhost:5173   ← your Vite dev URL
 */

import 'dotenv/config'
console.log('URL:', process.env.SUPABASE_URL)
console.log('KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
import express from 'express'
import cors from 'cors'
import deskRoutes, { startCron } from './routes/desk.js'
import waitlistRouter, { startWaitlistCron, notifyNextInQueue } from './routes/waitlist.js'

const app  = express()
const PORT = process.env.PORT || 3001

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST'],
}))
app.use(express.json())

// ── Routes ──────────────────────────────────────────────────────────────────
app.use(deskRoutes)
app.use(waitlistRouter) 
// Health check
app.get('/health', (_, res) => res.json({ ok: true }))

// ── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`DeskGuard backend running on http://localhost:${PORT}`)
  startCron()
  console.log('[cron] Auto-expire job started (60s interval)')
})