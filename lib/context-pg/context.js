import { createUmzeptionContext } from '../context.js';
import { createFastifyPostgresStyleDb } from './utils.js';

// TODO: Extract pg context into a "umzeption-pg" module

/** @import { FastifyPostgresStyleDb, UmzeptionContext } from '../advanced-types.d.ts' */

/**
 * @param {FastifyPostgresStyleDb["pool"]} pool
 * @returns {UmzeptionContext<'pg', FastifyPostgresStyleDb>}
 */
export function createUmzeptionPgContext (pool) {
  const db = createFastifyPostgresStyleDb(pool);

  return createUmzeptionContext('pg', db);
}
