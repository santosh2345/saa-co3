// GET  /api/progress              -> { progress: { [questionId]: entry } }
// POST /api/progress { changes }   -> merges changed entries (newest `t` wins)
// POST /api/progress { replace }   -> replaces everything (reset / import); other devices
//                                     drop local entries older than the reset time
import { redis, userFromRequest, send, fail } from './_lib.js';

const key = user => `progress:${user}`;

async function readAll(user) {
  const flat = (await redis('HGETALL', key(user))) || [];
  const out = {};
  for (let i = 0; i < flat.length; i += 2) {
    try { out[flat[i]] = JSON.parse(flat[i + 1]); } catch {}
  }
  return out;
}

function validEntries(obj) {
  if (!obj || typeof obj !== 'object') return [];
  return Object.entries(obj).filter(([id, v]) => /^[\w-]{1,64}$/.test(id) && v && typeof v === 'object').slice(0, 2000);
}

export default async function handler(req, res) {
  try {
    const user = await userFromRequest(req);
    if (!user) return send(res, 401, { error: 'Please sign in again' });

    if (req.method === 'GET') {
      const resetAt = Number(await redis('GET', `progress-reset:${user}`)) || 0;
      return send(res, 200, { progress: await readAll(user), resetAt });
    }
    if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });

    const body = req.body || {};
    if (body.replace) {
      const entries = validEntries(body.replace);
      await redis('DEL', key(user));
      await redis('SET', `progress-reset:${user}`, Date.now());
      if (entries.length) await redis('HSET', key(user), ...entries.flatMap(([id, v]) => [id, JSON.stringify(v)]));
      return send(res, 200, { ok: true, count: entries.length });
    }

    const changes = validEntries(body.changes);
    if (!changes.length) return send(res, 200, { ok: true, count: 0 });
    // Keep whichever copy of each question was changed most recently.
    const current = await redis('HMGET', key(user), ...changes.map(([id]) => id));
    const newer = changes.filter(([, v], i) => {
      const old = current[i] ? JSON.parse(current[i]) : null;
      return !old || (v.t || 0) >= (old.t || 0);
    });
    if (newer.length) await redis('HSET', key(user), ...newer.flatMap(([id, v]) => [id, JSON.stringify(v)]));
    send(res, 200, { ok: true, count: newer.length });
  } catch (err) {
    fail(res, err);
  }
}
