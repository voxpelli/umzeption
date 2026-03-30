/** @typedef {import('./pg-types.d.ts').FastifyPostgresStyleDb} FastifyPostgresStyleDb */

/** @type {ReadonlySet<string>} */
const VALID_ISOLATION_LEVELS = new Set([
  'READ UNCOMMITTED',
  'READ COMMITTED',
  'REPEATABLE READ',
  'SERIALIZABLE',
]);

/**
 * @template T
 * @this {FastifyPostgresStyleDb["pool"]}
 * @param {(client: import('pg').PoolClient) => Promise<T>} fn
 * @param {{ isolationLevel?: string }} [options]
 * @returns {Promise<T>}
 */
async function transact (fn, options) {
  const client = await this.connect();

  try {
    let beginSql = 'BEGIN';
    if (options?.isolationLevel) {
      const normalized = options.isolationLevel.toUpperCase();
      if (!VALID_ISOLATION_LEVELS.has(normalized)) {
        throw new TypeError(`Invalid isolation level: "${options.isolationLevel}"`);
      }
      beginSql = `BEGIN TRANSACTION ISOLATION LEVEL ${normalized}`;
    }
    await client.query(beginSql);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (cause) {
    try { await client.query('ROLLBACK'); } catch { /* ignore rollback errors */ }
    throw new Error('Transaction rolled back', { cause });
  } finally {
    client.release();
  }
}

/**
 * @param {FastifyPostgresStyleDb["pool"]} pool
 * @returns {FastifyPostgresStyleDb}
 */
export function createFastifyPostgresStyleDb (pool) {
  return {
    connect: pool.connect.bind(pool),
    destroy: () => pool.end(),
    pool,
    query: pool.query.bind(pool),
    transact: /** @type {FastifyPostgresStyleDb["transact"]} */ (transact.bind(pool)),
  };
}
