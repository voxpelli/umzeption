import { loadDependencies } from './lib/dependencies.js';

/**
 * @template T
 * @param {UmzeptionConfig<T>} config
 * @param {T} context
 * @returns {Promise<Array<import('umzug').RunnableMigration<T>>>}
 */
async function umzeptionLookup (config, context) {
  const {
    dependencies,
    // glob,
  } = config;

  const declarations = await loadDependencies(dependencies);

  // TODO: Make use of declarations!

  return [];
}

/**
 * @template T
 * @typedef UmzeptionConfig
 * @property {import('umzug').GlobInputMigrations<T>["glob"]} glob
 * @property {string[]} dependencies
 */

/**
 * @template T
 * @param {UmzeptionConfig<T>} config
 * @returns {(context: T) => Promise<import('umzug').InputMigrations<T>>}
 */
export function umzeption (config) {
  return async context => umzeptionLookup(config, context);
}
