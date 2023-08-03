import { umzeptionLookup } from './lookup.js';

/**
 * @template T
 * @param {import('./lookup.js').UmzeptionLookupOptions<T>} config
 * @returns {(context: T) => Promise<import('umzug').InputMigrations<T>>}
 */
export function umzeption (config) {
  return async context => umzeptionLookup(config, context);
}
