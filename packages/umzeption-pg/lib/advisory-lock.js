/** @typedef {import('./pg-types.d.ts').UmzeptionPgContext} UmzeptionPgContext */

/**
 * Execute a function while holding a PostgreSQL advisory lock.
 * The lock is session-level and automatically released when done.
 *
 * @template T
 * @param {UmzeptionPgContext} context
 * @param {number} lockId - integer lock identifier
 * @param {() => Promise<T>} fn
 * @returns {Promise<T>}
 */
export async function withAdvisoryLock (context, lockId, fn) {
  await context.value.query(`SELECT pg_advisory_lock($1)`, [String(lockId)]);
  try {
    return await fn();
  } finally {
    await context.value.query(`SELECT pg_advisory_unlock($1)`, [String(lockId)]);
  }
}
