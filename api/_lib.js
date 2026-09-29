// Shared helpers for the API routes. Files starting with "_" are not deployed as routes.
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

// Upstash Redis REST API. Vercel's Upstash integration sets either the KV_* or UPSTASH_* names.
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export async function redis(...cmd) {
  if (!URL_ || !TOKEN) throw new Error('Redis is not configured (connect Upstash Redis to this Vercel project)');
  const r = await fetch(URL_, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  const data = await r.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

export function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}

export function checkPassword(password, stored) {
  const [salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;
  const a = Buffer.from(hash, 'hex');
  const b = scryptSync(password, salt, 64);
  return a.length === b.length && timingSafeEqual(a, b);
}

const SESSION_TTL = 60 * 60 * 24 * 180; // 180 days

export async function createSession(username) {
  const token = randomBytes(32).toString('hex');
  await redis('SET', `session:${token}`, username, 'EX', SESSION_TTL);
  return token;
}

// Returns the username for the request's bearer token, or null.
export async function userFromRequest(req) {
  const m = /^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization || '');
  if (!m) return null;
  return redis('GET', `session:${m[1]}`);
}

export function send(res, status, body) {
  res.status(status).setHeader('Cache-Control', 'no-store').json(body);
}

export function fail(res, err) {
  console.error(err);
  send(res, 500, { error: err.message || 'Server error' });
}
