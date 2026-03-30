import { umzeptionLookup } from './lookup.js';

/**
 * @template {import('./advanced-types.d.ts').AnyUmzeptionContext} T
 * @param {import('./advanced-types.d.ts').UmzeptionLookupOptions<T>} config
 * @returns {(context: T) => Promise<import('umzug').InputMigrations<T>>}
 */
export function umzeption (config) {
  return async context => umzeptionLookup(config, context);
}

/**
 * Get pending (not yet executed) migrations for a given config and storage.
 *
 * @template {import('./advanced-types.d.ts').AnyUmzeptionContext} T
 * @param {import('./advanced-types.d.ts').UmzeptionLookupOptions<T>} config
 * @param {import('./advanced-types.d.ts').UmzeptionStorage<T>} storage
 * @param {T} context
 * @returns {Promise<string[]>}
 */
export async function umzeptionPending (config, storage, context) {
  const allMigrations = await umzeptionLookup(config, context);
  const executed = await storage.executed({ context });
  const executedSet = new Set(executed);

  return allMigrations
    .map(m => m.name)
    .filter(name => !executedSet.has(name));
}
