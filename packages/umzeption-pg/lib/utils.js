/** @typedef {import('./pg-types.d.ts').FastifyPostgresStyleDb} FastifyPostgresStyleDb */

/** @type {ReadonlySet<string>} */
const VALID_ISOLATION_LEVELS = new Set([
  'READ UNCOMMITTED',
  'READ COMMITTED',
  'REPEATABLE READ',
  'SERIALIZABLE',
]);

/**
 * @this {FastifyPostgresStyleDb["pool"]}
 * @param {Parameters<FastifyPostgresStyleDb["transact"]>[0]} fn
 * @param {{ isolationLevel?: string }} [options]
 */
async function transact (fn, options) {
  const client = await this.connect();

  try {
    let beginSql = 'BEGIN';
    if (options?.isolationLevel) {
      if (!VALID_ISOLATION_LEVELS.has(options.isolationLevel.toUpperCase())) {
        throw new TypeError(`Invalid isolation level: "${options.isolationLevel}"`);
      }
      beginSql = `BEGIN TRANSACTION ISOLATION LEVEL ${options.isolationLevel.toUpperCase()}`;
    }
    await client.query(beginSql);
    await fn(client);
    await client.query('COMMIT');
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
    pool,
    query: pool.query.bind(pool),
    transact: transact.bind(pool),
  };
}
