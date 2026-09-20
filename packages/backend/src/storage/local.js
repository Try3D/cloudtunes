import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.env.LOCAL_STORAGE_DIR || './storage');

const full = (key) => path.join(root, key);

export async function put(key, body, _contentType) {
  const dest = full(key);
  await fs.promises.mkdir(path.dirname(dest), { recursive: true });
  if (Buffer.isBuffer(body)) await fs.promises.writeFile(dest, body);
  else await fs.promises.copyFile(body, dest); // body is a temp path
  return key;
}

// mirrors the s3 driver: stream plus 206 headers
export async function getRange(key, range) {
  const dest = full(key);
  const { size } = await fs.promises.stat(dest);
  if (!range) {
    return { stream: fs.createReadStream(dest), contentLength: size, contentRange: null, size };
  }
  const [startRaw, endRaw] = range.replace(/bytes=/, '').split('-');
  const start = Number(startRaw) || 0;
  const end = endRaw ? Math.min(Number(endRaw), size - 1) : size - 1;
  return {
    stream: fs.createReadStream(dest, { start, end }),
    contentLength: end - start + 1,
    contentRange: `bytes ${start}-${end}/${size}`,
    size,
  };
}

export async function remove(key) {
  await fs.promises.rm(full(key), { force: true });
}

export async function healthy() {
  await fs.promises.mkdir(root, { recursive: true });
  return true;
}
