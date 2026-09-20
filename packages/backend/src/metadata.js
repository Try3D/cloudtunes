import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { parseFile } from 'music-metadata';

export const AUDIO_TYPES = {
  '.mp3': 'audio/mpeg',
  '.flac': 'audio/flac',
  '.m4a': 'audio/mp4',
  '.ogg': 'audio/ogg',
  '.opus': 'audio/ogg',
  '.wav': 'audio/wav',
};

export function sha256(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    fs.createReadStream(filePath)
      .on('data', (d) => hash.update(d))
      .on('end', () => resolve(hash.digest('hex')))
      .on('error', reject);
  });
}

const UUID = /[-_\s]?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const LEADING_NUMBER = /^\d{1,4}\s*[-._)\]]*\s*/;   // "01 - ", "816_", "03."
const HASHY = /[-_\s][0-9a-f]{8,}$/i;                // trailing download hash

// download sites rarely tag files, so fall back to the filename
function tidy(text) {
  const cleaned = text
    .replace(LEADING_NUMBER, '')
    .replace(/[_+-]+/g, ' ')          // slug separators to spaces
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s.]+|[\s.]+$/g, '')
    .trim();

  // capitalise all-lower names, leave mixed case alone
  return cleaned === cleaned.toLowerCase()
    ? cleaned.replace(/\b[a-z]/g, (c) => c.toUpperCase())
    : cleaned;
}

// "artist - title.mp3" or "01 - artist - title.mp3"
function fromFilename(originalName) {
  const base = path.basename(originalName, path.extname(originalName))
    .replace(UUID, '')
    .replace(HASHY, '')
    .trim();

  // only a spaced hyphen splits artist from title, a slug hyphen does not
  const parts = base.split(/\s+[-–—]\s+/).map(tidy).filter(Boolean);
  if (parts.length >= 2) {
    return { artist: parts[0], title: parts.slice(1).join(' - ') };
  }
  return { artist: null, title: tidy(base) || null };
}

// read embedded tags, fall back to the filename and extract cover art
export async function extract(filePath, originalName) {
  const guess = fromFilename(originalName);
  let common = {};
  let format = {};
  try {
    ({ common, format } = await parseFile(filePath, { duration: true }));
  } catch {
    // unreadable tags fall back to filename metadata
  }

  const picture = common.picture?.[0] || null;
  const { size } = await fs.promises.stat(filePath);

  return {
    title: common.title?.trim() || guess.title || 'Unknown Title',
    artist: common.artist?.trim() || guess.artist || 'Unknown Artist',
    album: common.album?.trim() || null,
    album_artist: common.albumartist?.trim() || null,
    genre: common.genre?.[0]?.trim() || null,
    year: common.year || null,
    track_no: common.track?.no || null,
    duration_sec: format.duration ? Math.round(format.duration) : null,
    bitrate_kbps: format.bitrate ? Math.round(format.bitrate / 1000) : null,
    codec: format.codec || path.extname(originalName).slice(1).toUpperCase() || null,
    file_size: size,
    cover: picture ? { buffer: Buffer.from(picture.data), type: picture.format } : null,
  };
}
