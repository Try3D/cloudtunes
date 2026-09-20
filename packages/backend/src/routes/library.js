import { Router } from 'express';
import { query, one } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { remove } from '../storage/index.js';

const router = Router();
router.use(requireAuth);

const COLUMNS = `id, title, artist, album, album_artist, genre, year, track_no,
                 duration_sec, bitrate_kbps, codec, file_size, cover_key,
                 uploaded_by, uploaded_at`;

router.get('/songs', async (req, res, next) => {
  try {
    const { q, genre, artist, album } = req.query;
    const limit = Math.min(Number(req.query.limit) || 100, 200);
    const offset = Number(req.query.offset) || 0;

    const where = [];
    const params = [];
    if (q) {
      where.push('(title LIKE ? OR artist LIKE ? OR album LIKE ?)');
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    for (const [col, val] of [['genre', genre], ['artist', artist], ['album', album]]) {
      if (val) { where.push(`${col} = ?`); params.push(val); }
    }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const songs = await query(
      `SELECT ${COLUMNS} FROM songs ${clause} ORDER BY artist, album, track_no, title LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    const [{ total }] = await query(`SELECT COUNT(*) AS total FROM songs ${clause}`, params);
    res.json({ songs, total });
  } catch (err) { next(err); }
});

router.get('/songs/:id', async (req, res, next) => {
  try {
    const song = await one(`SELECT ${COLUMNS}, sha256, audio_key FROM songs WHERE id = ?`, [req.params.id]);
    if (!song) return res.sendStatus(404);
    res.json({ song });
  } catch (err) { next(err); }
});

// uploader or admin can delete
router.delete('/songs/:id', async (req, res, next) => {
  try {
    const song = await one('SELECT audio_key, cover_key, uploaded_by FROM songs WHERE id = ?',
      [req.params.id]);
    if (!song) return res.sendStatus(404);
    const { id: userId, isAdmin } = req.session.user;
    if (!isAdmin && song.uploaded_by !== userId) {
      return res.status(403).json({ error: 'You can only delete tracks you uploaded' });
    }
    await query('DELETE FROM songs WHERE id = ?', [req.params.id]);
    await remove(song.audio_key);
    if (song.cover_key) await remove(song.cover_key);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.get('/albums', async (_req, res, next) => {
  try {
    res.json({
      albums: await query(`
        SELECT album, COALESCE(album_artist, artist) AS artist, year,
               COUNT(*) AS tracks, MIN(id) AS cover_song_id
        FROM songs WHERE album IS NOT NULL
        GROUP BY album, COALESCE(album_artist, artist), year
        ORDER BY artist, album`),
    });
  } catch (err) { next(err); }
});

router.get('/artists', async (_req, res, next) => {
  try {
    res.json({
      artists: await query(`
        SELECT artist, COUNT(*) AS tracks, COUNT(DISTINCT album) AS albums, MIN(id) AS cover_song_id
        FROM songs GROUP BY artist ORDER BY artist`),
    });
  } catch (err) { next(err); }
});

router.get('/genres', async (_req, res, next) => {
  try {
    res.json({
      genres: await query(
        'SELECT genre, COUNT(*) AS tracks FROM songs WHERE genre IS NOT NULL GROUP BY genre ORDER BY tracks DESC',
      ),
    });
  } catch (err) { next(err); }
});

export default router;
