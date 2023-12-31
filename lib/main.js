import { umzeptionLookup } from './lookup.js';

/**
 * @template {import('./advanced-types.d.ts').AnyUmzeptionContext} T
 * @param {import('./advanced-types.d.ts').UmzeptionLookupOptions<T>} config
 * @returns {(context: T) => Promise<import('umzug').InputMigrations<T>>}
 */
export function umzeption (config) {
  return async context => umzeptionLookup(config, context);
}
