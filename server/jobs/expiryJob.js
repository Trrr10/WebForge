const cron = require('node-cron');
const supabase = require('../db/supabase');

/**
 * Runs every 60 seconds.
 * 1. Marks 'occupied' desks as 'abandoned' if expires_at has passed.
 * 2. Marks 'away' desks as 'abandoned' if expires_at has passed.
 * 3. Logs the ended sessions.
 */
function startExpiryJob() {
  cron.schedule('* * * * *', async () => {
    const now = new Date().toISOString();

    // Fetch all desks that should have expired
    const { data: expiredDesks, error } = await supabase
      .from('desks')
      .select('id, student_id, checked_in_at, status')
      .in('status', ['occupied', 'away'])
      .lte('expires_at', now);

    if (error) {
      console.error('[ExpiryJob] fetch error:', error.message);
      return;
    }

    if (!expiredDesks || expiredDesks.length === 0) return;

    console.log(`[ExpiryJob] Expiring ${expiredDesks.length} desk(s)...`);

    for (const desk of expiredDesks) {
      // 1. Mark desk as abandoned
      const { error: updateErr } = await supabase
        .from('desks')
        .update({
          status: 'abandoned',
          expires_at: null,
        })
        .eq('id', desk.id);

      if (updateErr) {
        console.error(`[ExpiryJob] update error for ${desk.id}:`, updateErr.message);
        continue;
      }

      // 2. Write session record
      const checkedInAt = new Date(desk.checked_in_at);
      const checkedOutAt = new Date(now);
      const durationMins = Math.round((checkedOutAt - checkedInAt) / 60000);

      await supabase.from('sessions').insert({
        desk_id: desk.id,
        student_id: desk.student_id,
        checked_in_at: desk.checked_in_at,
        checked_out_at: now,
        duration_mins: durationMins,
        end_reason: 'expired',
      });
    }
  });

  console.log('[ExpiryJob] Cron job started — checks every 60 seconds.');
}

module.exports = { startExpiryJob };