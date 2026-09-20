import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { put } from '../storage/index.js';

const router = Router();
router.use(requireAuth);

router.get('/analytics', async (_req, res, next) => {
  try {
    const [totals] = await query(`
      SELECT (SELECT COUNT(*) FROM songs) AS songs,
             (SELECT COUNT(*) FROM users) AS users,
             (SELECT COUNT(*) FROM play_history) AS plays,
             (SELECT COALESCE(SUM(duration_sec), 0) FROM songs) AS library_seconds,
             (SELECT COALESCE(SUM(file_size), 0) FROM songs) AS storage_bytes`);

    const [topSongs, topArtists, byGenre, byHour, daily, topUsers] = await Promise.all([
      query(`SELECT s.id, s.title, s.artist, COUNT(*) AS plays
             FROM play_history p JOIN songs s ON s.id = p.song_id
             GROUP BY s.id ORDER BY plays DESC LIMIT 10`),
      query(`SELECT s.artist, COUNT(*) AS plays
             FROM play_history p JOIN songs s ON s.id = p.song_id
             GROUP BY s.artist ORDER BY plays DESC LIMIT 10`),
      query(`SELECT COALESCE(s.genre, 'Unknown') AS genre, COUNT(*) AS plays
             FROM play_history p JOIN songs s ON s.id = p.song_id
             GROUP BY s.genre ORDER BY plays DESC`),
      query(`SELECT HOUR(played_at) AS hour, COUNT(*) AS plays
             FROM play_history GROUP BY hour ORDER BY hour`),
      query(`SELECT DATE(played_at) AS day, COUNT(*) AS plays
             FROM play_history WHERE played_at >= NOW() - INTERVAL 30 DAY
             GROUP BY day ORDER BY day`),
      query(`SELECT u.username, COUNT(*) AS plays,
                    ROUND(COALESCE(SUM(s.duration_sec), 0) / 60) AS minutes
             FROM play_history p JOIN users u ON u.id = p.user_id
             JOIN songs s ON s.id = p.song_id
             GROUP BY u.id ORDER BY plays DESC LIMIT 10`),
    ]);

    res.json({ totals, topSongs, topArtists, byGenre, byHour, daily, topUsers });
  } catch (err) { next(err); }
});

// dump the play log to storage for batch processing
router.post('/export', requireAdmin, async (_req, res, next) => {
  try {
    const rows = await query(`
      SELECT p.id, u.username, s.title, s.artist, COALESCE(s.genre, '') AS genre, p.played_at
      FROM play_history p JOIN users u ON u.id = p.user_id JOIN songs s ON s.id = p.song_id
      ORDER BY p.played_at`);

    const escape = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = ['id,username,title,artist,genre,played_at',
      ...rows.map((r) => [r.id, r.username, r.title, r.artist, r.genre,
        new Date(r.played_at).toISOString()].map(escape).join(',')),
    ].join('\n');

    const key = `exports/plays_${new Date().toISOString().slice(0, 10)}.csv`;
    await put(key, Buffer.from(csv, 'utf8'), 'text/csv');
    res.json({ key, rows: rows.length });
  } catch (err) { next(err); }
});

export default router;
