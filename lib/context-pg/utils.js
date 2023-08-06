/** @typedef {import('../advanced-types.js').FastifyPostgresStyleDb} FastifyPostgresStyleDb */

/**
 * @this {FastifyPostgresStyleDb["pool"]}
 * @param {Parameters<FastifyPostgresStyleDb["transact"]>[0]} fn
 */
async function transact (fn) {
  const client = await this.connect();

  try {
    await client.query('BEGIN');
    await fn(client);
    await client.query('COMMIT');
  } catch {
    await client.query('ROLLBACK');
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
