import { Router } from 'express';
import { query, one } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// ownership check, one user can't touch another's playlist
async function owned(playlistId, userId) {
  return one('SELECT * FROM playlists WHERE id = ? AND user_id = ?', [playlistId, userId]);
}

router.get('/playlists', async (req, res, next) => {
  try {
    res.json({
      playlists: await query(`
        SELECT p.id, p.name, p.created_at, COUNT(ps.song_id) AS tracks
        FROM playlists p LEFT JOIN playlist_songs ps ON ps.playlist_id = p.id
        WHERE p.user_id = ? GROUP BY p.id ORDER BY p.created_at DESC`, [req.session.user.id]),
    });
  } catch (err) { next(err); }
});

router.post('/playlists', async (req, res, next) => {
  try {
    const name = (req.body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Name required' });
    const result = await query('INSERT INTO playlists (user_id, name) VALUES (?, ?)',
      [req.session.user.id, name]);
    res.status(201).json({ playlist: { id: result.insertId, name, tracks: 0 } });
  } catch (err) { next(err); }
});

router.get('/playlists/:id', async (req, res, next) => {
  try {
    const playlist = await owned(req.params.id, req.session.user.id);
    if (!playlist) return res.sendStatus(404);
    const songs = await query(`
      SELECT s.id, s.title, s.artist, s.album, s.genre, s.duration_sec, s.cover_key, ps.position
      FROM playlist_songs ps JOIN songs s ON s.id = ps.song_id
      WHERE ps.playlist_id = ? ORDER BY ps.position, ps.added_at`, [req.params.id]);
    res.json({ playlist, songs });
  } catch (err) { next(err); }
});

router.patch('/playlists/:id', async (req, res, next) => {
  try {
    if (!(await owned(req.params.id, req.session.user.id))) return res.sendStatus(404);
    const name = (req.body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Name required' });
    await query('UPDATE playlists SET name = ? WHERE id = ?', [name, req.params.id]);
    res.json({ ok: true, name });
  } catch (err) { next(err); }
});

router.delete('/playlists/:id', async (req, res, next) => {
  try {
    if (!(await owned(req.params.id, req.session.user.id))) return res.sendStatus(404);
    await query('DELETE FROM playlists WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.post('/playlists/:id/songs', async (req, res, next) => {
  try {
    if (!(await owned(req.params.id, req.session.user.id))) return res.sendStatus(404);
    const [{ next_pos }] = await query(
      'SELECT COALESCE(MAX(position), 0) + 1 AS next_pos FROM playlist_songs WHERE playlist_id = ?',
      [req.params.id]);
    await query(
      'INSERT IGNORE INTO playlist_songs (playlist_id, song_id, position) VALUES (?, ?, ?)',
      [req.params.id, req.body.song_id, next_pos]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.delete('/playlists/:id/songs/:songId', async (req, res, next) => {
  try {
    if (!(await owned(req.params.id, req.session.user.id))) return res.sendStatus(404);
    await query('DELETE FROM playlist_songs WHERE playlist_id = ? AND song_id = ?',
      [req.params.id, req.params.songId]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
