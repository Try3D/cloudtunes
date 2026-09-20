import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import session from 'express-session';
import MySQLStoreFactory from 'express-mysql-session';
import { pool, dbConfig, query } from './db.js';
import { healthy, driverName } from './storage/index.js';
import authRoutes from './routes/auth.js';
import libraryRoutes from './routes/library.js';
import streamRoutes from './routes/stream.js';
import uploadRoutes from './routes/upload.js';
import playlistRoutes from './routes/playlists.js';
import analyticsRoutes from './routes/analytics.js';

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.set('trust proxy', 1); // behind nginx
// plain http, so disable the insecure-requests upgrade
app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: { directives: { 'upgrade-insecure-requests': null } },
}));
app.use(express.json());

// dev-only cors allowlist for vite on :5173
const origins = (process.env.CORS_ORIGIN || '').split(',').filter(Boolean);
if (origins.length) {
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origins.includes(origin)) {
      res.set({
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      });
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });
}

const MySQLStore = MySQLStoreFactory(session);
app.use(session({
  key: 'cloudtunes.sid',
  secret: process.env.SESSION_SECRET || 'dev-only-secret',
  store: new MySQLStore({ createDatabaseTable: true }, pool),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: false, // no https
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
}));

app.get('/api/health', async (_req, res) => {
  const status = { db: 'down', storage: 'down', driver: driverName };
  try { await query('SELECT 1'); status.db = 'ok'; } catch { /* reported as down */ }
  try { await healthy(); status.storage = 'ok'; } catch { /* reported as down */ }
  res.status(status.db === 'ok' && status.storage === 'ok' ? 200 : 503).json(status);
});

app.use('/api', authRoutes);
app.use('/api', libraryRoutes);
app.use('/api', streamRoutes);
app.use('/api', uploadRoutes);
app.use('/api', playlistRoutes);
app.use('/api', analyticsRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.message === 'Unsupported audio format' ? 400
    : err.code === 'LIMIT_FILE_SIZE' ? 413 : 500;
  res.status(status).json({ error: status === 500 ? 'Internal server error' : err.message });
});

app.listen(PORT, () => {
  console.log(`CloudTunes API on http://localhost:${PORT} (storage: ${driverName}, db: ${dbConfig.host})`);
});
