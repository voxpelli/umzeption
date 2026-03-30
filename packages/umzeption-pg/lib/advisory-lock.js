/** @typedef {import('./pg-types.d.ts').UmzeptionPgContext} UmzeptionPgContext */

/**
 * Execute a function while holding a PostgreSQL advisory lock.
 * Uses a dedicated pool client to ensure lock and unlock happen
 * on the same connection (advisory locks are session-level).
 *
 * @template T
 * @param {UmzeptionPgContext} context
 * @param {number} lockId - integer lock identifier
 * @param {() => Promise<T>} fn
 * @param {{ lockTimeoutMs?: number }} [options]
 * @returns {Promise<T>}
 */
export async function withAdvisoryLock (context, lockId, fn, options) {
  if (!Number.isSafeInteger(lockId)) {
    throw new TypeError(`Invalid lockId: ${lockId}. Must be a safe integer.`);
  }

  const client = await context.value.connect();

  try {
    if (options?.lockTimeoutMs !== undefined) {
      const timeout = Number(options.lockTimeoutMs);

      if (!Number.isSafeInteger(timeout) || timeout < 0) {
        throw new TypeError(`Invalid lockTimeoutMs: ${options.lockTimeoutMs}. Must be a non-negative safe integer.`);
      }

      await client.query(`SET lock_timeout = ${timeout}`);
    }

    await client.query('SELECT pg_advisory_lock($1)', [lockId]);

    try {
      return await fn();
    } finally {
      // Best-effort unlock — PG auto-releases session locks on disconnect
      try { await client.query('SELECT pg_advisory_unlock($1)', [lockId]); } catch { /* ignored */ }
    }
  } finally {
    client.release();
  }
}
