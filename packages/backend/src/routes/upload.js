import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { Router } from 'express';
import multer from 'multer';
import { query, one } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { put } from '../storage/index.js';
import { extract, sha256, AUDIO_TYPES } from '../metadata.js';

const router = Router();
router.use(requireAuth);

// disk storage keeps large files out of memory
const upload = multer({
  dest: path.join(os.tmpdir(), 'cloudtunes'),
  limits: { fileSize: Number(process.env.MAX_UPLOAD_MB || 30) * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = AUDIO_TYPES[path.extname(file.originalname).toLowerCase()];
    cb(ok ? null : new Error('Unsupported audio format'), !!ok);
  },
});

async function ingest(file, userId) {
  const ext = path.extname(file.originalname).toLowerCase();
  const hash = await sha256(file.path);

  const existing = await one('SELECT id, title FROM songs WHERE sha256 = ?', [hash]);
  if (existing) return { file: file.originalname, status: 'duplicate', song_id: existing.id };

  const meta = await extract(file.path, file.originalname);
  const id = crypto.randomUUID();

  const audioKey = `audio/${id}${ext}`;
  await put(audioKey, file.path, AUDIO_TYPES[ext]);

  let coverKey = null;
  if (meta.cover) {
    coverKey = `covers/${id}.${meta.cover.type.includes('png') ? 'png' : 'jpg'}`;
    await put(coverKey, meta.cover.buffer, meta.cover.type);
  }

  const result = await query(
    `INSERT INTO songs (title, artist, album, album_artist, genre, year, track_no,
       duration_sec, bitrate_kbps, codec, file_size, sha256, audio_key, cover_key, uploaded_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [meta.title, meta.artist, meta.album, meta.album_artist, meta.genre, meta.year, meta.track_no,
      meta.duration_sec, meta.bitrate_kbps, meta.codec, meta.file_size, hash, audioKey, coverKey, userId],
  );

  return {
    file: file.originalname,
    status: 'ok',
    song_id: result.insertId,
    metadata: { title: meta.title, artist: meta.artist, album: meta.album,
      year: meta.year, duration_sec: meta.duration_sec, cover: !!coverKey },
  };
}

router.post('/upload', upload.array('files', 20), async (req, res, next) => {
  const files = req.files || [];
  if (!files.length) return res.status(400).json({ error: 'No files uploaded' });
  try {
    const results = [];
    for (const file of files) {
      // one bad file must not abort the batch
      try {
        results.push(await ingest(file, req.session.user.id));
      } catch (err) {
        results.push({ file: file.originalname, status: 'error', error: err.message });
      }
    }
    res.json({ results });
  } catch (err) {
    next(err);
  } finally {
    await Promise.all(files.map((f) => fs.promises.rm(f.path, { force: true })));
  }
});

export default router;
