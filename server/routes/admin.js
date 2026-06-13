const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');

// Simple token-based auth middleware for admin routes
function adminAuth(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (!token || token !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// GET /api/admin/desks — all desks with sessions joined
router.get('/desks', adminAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('desks')
    .select('*')
    .order('section')
    .order('row_num');

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/admin/sessions — recent session log
router.get('/sessions', adminAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .order('checked_in_at', { ascending: false })
    .limit(100);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/admin/stats
router.get('/stats', adminAuth, async (req, res) => {
  const { data: desks, error } = await supabase.from('desks').select('status');
  if (error) return res.status(500).json({ error: error.message });

  const counts = { free: 0, occupied: 0, away: 0, abandoned: 0, total: desks.length };
  desks.forEach(d => counts[d.status]++);
  res.json(counts);
});

// POST /api/admin/reset/:id — free a specific desk
router.post('/reset/:id', adminAuth, async (req, res) => {
  const { data: desk, error: fetchErr } = await supabase
    .from('desks')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (fetchErr) return res.status(404).json({ error: 'Desk not found' });

  // Log the session if it was occupied
  if (desk.student_id && desk.checked_in_at) {
    const now = new Date();
    const durationMins = Math.round((now - new Date(desk.checked_in_at)) / 60000);
    await supabase.from('sessions').insert({
      desk_id: desk.id,
      student_id: desk.student_id,
      checked_in_at: desk.checked_in_at,
      checked_out_at: now.toISOString(),
      duration_mins: durationMins,
      end_reason: 'admin_reset',
    });
  }

  const { error: updateErr } = await supabase
    .from('desks')
    .update({
      status: 'free',
      student_id: null,
      checked_in_at: null,
      away_at: null,
      expires_at: null,
    })
    .eq('id', req.params.id);

  if (updateErr) return res.status(500).json({ error: updateErr.message });
  res.json({ success: true });
});

// POST /api/admin/reset-all — free ALL abandoned desks
router.post('/reset-all', adminAuth, async (req, res) => {
  const { error } = await supabase
    .from('desks')
    .update({
      status: 'free',
      student_id: null,
      checked_in_at: null,
      away_at: null,
      expires_at: null,
    })
    .eq('status', 'abandoned');

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

module.exports = router;