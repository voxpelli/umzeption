/**
 * @template T
 * @param {T} context
 * @returns {Promise<import('umzug').InputMigrations<T>>}
 */
async function umzeptionLookup (context) {
  return {};
}

/**
 * @template T
 * @typedef UmzeptionConfig
 * @property {import('umzug').GlobInputMigrations<T>["glob"]} glob
 * @property {{ [prefix: string]: string }} dependencies
 */

/**
 * @template T
 * @param {UmzeptionConfig<T>} config
 * @returns {(context: T) => Promise<import('umzug').InputMigrations<T>>}
 */
export function umzeption (config) {
  return async context => umzeptionLookup(context);
}
