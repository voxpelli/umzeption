import { umzeptionLookup } from './lib/lookup.js';

/**
 * @template T
 * @param {import('./lib/lookup.js').UmzeptionLookupDefinition<T>} config
 * @returns {(context: T) => Promise<import('umzug').InputMigrations<T>>}
 */
export function umzeption (config) {
  return async context => umzeptionLookup(config, context);
}
