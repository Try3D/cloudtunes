import { Router } from 'express';
import { query, one } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { getRange } from '../storage/index.js';
import { AUDIO_TYPES } from '../metadata.js';

const router = Router();
router.use(requireAuth);

// audio is proxied so every byte passes requireAuth
router.get('/stream/:id', async (req, res, next) => {
  try {
    const song = await one('SELECT audio_key, codec FROM songs WHERE id = ?', [req.params.id]);
    if (!song) return res.sendStatus(404);

    const ext = song.audio_key.slice(song.audio_key.lastIndexOf('.'));
    const { stream, contentLength, contentRange } = await getRange(song.audio_key, req.headers.range);

    res.set({
      'Content-Type': AUDIO_TYPES[ext] || 'audio/mpeg',
      'Content-Length': contentLength,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, max-age=3600',
    });
    // 206 keeps seeking working
    if (contentRange) res.status(206).set('Content-Range', contentRange);

    stream.on('error', next);
    stream.pipe(res);
  } catch (err) { next(err); }
});

router.get('/cover/:id', async (req, res, next) => {
  try {
    const song = await one('SELECT cover_key FROM songs WHERE id = ?', [req.params.id]);
    if (!song?.cover_key) return res.sendStatus(404);
    const { stream, contentLength } = await getRange(song.cover_key);
    res.set({
      'Content-Type': song.cover_key.endsWith('.png') ? 'image/png' : 'image/jpeg',
      'Content-Length': contentLength,
      'Cache-Control': 'private, max-age=86400',
    });
    stream.on('error', next);
    stream.pipe(res);
  } catch (err) { next(err); }
});

// fired on real playback start so seeking doesn't inflate counts
router.post('/play/:id', async (req, res, next) => {
  try {
    await query('INSERT INTO play_history (user_id, song_id) VALUES (?, ?)', [
      req.session.user.id, req.params.id,
    ]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
