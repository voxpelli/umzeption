import { umzeptionLookup } from './lib/lookup.js';

/**
 * @template T
 * @param {import('./lib/dependencies.js').UmzeptionDefinition<T>} config
 * @returns {(context: T) => Promise<import('umzug').InputMigrations<T>>}
 */
export function umzeption (config) {
  // TODO: Make name and pluginDir optional and resolve here instead?
  return async context => umzeptionLookup(config, context);
}
