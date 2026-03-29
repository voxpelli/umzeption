import { createUmzeptionContext } from 'umzeption';
import { createFastifyPostgresStyleDb } from './utils.js';

/** @typedef {import('./pg-types.d.ts').FastifyPostgresStyleDb} FastifyPostgresStyleDb */

/**
 * @param {FastifyPostgresStyleDb["pool"]} pool
 * @returns {import('umzeption').UmzeptionContext<'pg', FastifyPostgresStyleDb>}
 */
export function createUmzeptionPgContext (pool) {
  const db = createFastifyPostgresStyleDb(pool);

  return createUmzeptionContext('pg', db);
}
