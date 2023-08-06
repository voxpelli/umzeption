import { createUmzeptionContext } from '../context.js';
import { createFastifyPostgresStyleDb } from './utils.js';

// TODO: Extract pg context into a "umzeption-pg" module

/** @typedef {import('../advanced-types.js').FastifyPostgresStyleDb} FastifyPostgresStyleDb */

/**
 * @param {FastifyPostgresStyleDb["pool"]} pool
 * @returns {import('../advanced-types.js').UmzeptionContext<'pg', FastifyPostgresStyleDb>}
 */
export function createUmzeptionPgContext (pool) {
  const db = createFastifyPostgresStyleDb(pool);

  return createUmzeptionContext('pg', db);
}
