// POST /api/auth  { action: 'signup' | 'login' | 'logout', username, password }
import { redis, hashPassword, checkPassword, createSession, send, fail } from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  try {
    const { action, password } = req.body || {};
    const username = String(req.body?.username || '').trim().toLowerCase();

    if (action === 'logout') {
      const m = /^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization || '');
      if (m) await redis('DEL', `session:${m[1]}`);
      return send(res, 200, { ok: true });
    }

    if (!/^[a-z0-9_.-]{3,32}$/.test(username))
      return send(res, 400, { error: 'Username must be 3–32 characters: letters, numbers, _ . -' });
    if (typeof password !== 'string' || password.length < 6 || password.length > 200)
      return send(res, 400, { error: 'Password must be at least 6 characters' });

    // Basic brute-force protection: 20 attempts per username per 15 minutes.
    const tries = await redis('INCR', `tries:${username}`);
    if (tries === 1) await redis('EXPIRE', `tries:${username}`, 900);
    if (tries > 20) return send(res, 429, { error: 'Too many attempts. Try again in 15 minutes.' });

    if (action === 'signup') {
      const created = await redis('SET', `user:${username}`, hashPassword(password), 'NX');
      if (created !== 'OK') return send(res, 409, { error: 'That username is taken' });
    } else if (action === 'login') {
      const stored = await redis('GET', `user:${username}`);
      if (!stored || !checkPassword(password, stored))
        return send(res, 401, { error: 'Wrong username or password' });
    } else {
      return send(res, 400, { error: 'Unknown action' });
    }

    await redis('DEL', `tries:${username}`);
    send(res, 200, { token: await createSession(username), username });
  } catch (err) {
    fail(res, err);
  }
}
