import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { query, one } from '../db.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: { error: 'Too many attempts, try again later' },
});

const publicUser = (u) => ({ id: u.id, username: u.username, email: u.email, isAdmin: !!u.is_admin });

// fresh session id on login prevents fixation
function login(req, user) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.user = publicUser(user);
      req.session.save((e) => (e ? reject(e) : resolve()));
    });
  });
}

router.post('/signup', async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username || '')) {
      return res.status(400).json({ error: 'Username must be 3-30 letters, digits or underscore' });
    }
    if (!/^\S+@\S+\.\S+$/.test(email || '')) return res.status(400).json({ error: 'Invalid email' });
    if ((password || '').length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const clash = await one('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
    if (clash) return res.status(409).json({ error: 'Username or email already taken' });

    const hash = await bcrypt.hash(password, 12);
    // first account becomes admin
    const [{ count }] = await query('SELECT COUNT(*) AS count FROM users');
    const result = await query(
      'INSERT INTO users (username, email, password_hash, is_admin) VALUES (?, ?, ?, ?)',
      [username, email, hash, count === 0],
    );
    const user = await one('SELECT * FROM users WHERE id = ?', [result.insertId]);
    await login(req, user);
    res.status(201).json({ user: publicUser(user) });
  } catch (err) { next(err); }
});

router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const user = await one('SELECT * FROM users WHERE username = ? OR email = ?', [username, username]);
    // same error either way prevents account enumeration
    if (!user || !(await bcrypt.compare(password || '', user.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    await login(req, user);
    res.json({ user: publicUser(user) });
  } catch (err) { next(err); }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('cloudtunes.sid');
    res.json({ ok: true });
  });
});

router.get('/me', (req, res) => res.json({ user: req.session?.user || null }));

export default router;
