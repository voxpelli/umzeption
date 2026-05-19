import { umzeptionLookup } from './lookup.js';

/** @import { AnyUmzeptionContext, UmzeptionLookupOptions } from './advanced-types.d.ts' */

/**
 * @template {AnyUmzeptionContext} T
 * @param {UmzeptionLookupOptions<T>} config
 * @returns {(context: T) => Promise<import('umzug').InputMigrations<T>>}
 */
export function umzeption (config) {
  return async context => umzeptionLookup(config, context);
}
