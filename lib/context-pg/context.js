import { createUmzeptionContext } from '../context.js';
import { createFastifyPostgresStyleDb } from './utils.js';

// TODO(Sprint 27): Extract pg context into a separate "umzeption-pg" package (see SPRINT-PLAN.md Phase 4)

/** @typedef {import('../advanced-types.js').FastifyPostgresStyleDb} FastifyPostgresStyleDb */

/**
 * @param {FastifyPostgresStyleDb["pool"]} pool
 * @returns {import('../advanced-types.js').UmzeptionContext<'pg', FastifyPostgresStyleDb>}
 */
export function createUmzeptionPgContext (pool) {
  const db = createFastifyPostgresStyleDb(pool);

  return createUmzeptionContext('pg', db);
}
