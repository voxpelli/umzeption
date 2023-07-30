import { loadDependencies } from './dependencies.js';
import { resolveDefinition } from './resolve-definition.js';

/**
 * @template {object} T
 * @template {keyof T} K
 * @typedef {Omit<T, K> & Partial<Pick<T, K>>} PartialKeys
 */

/**
 * @template T
 * @typedef {PartialKeys<import('./dependencies.js').UmzeptionDefinition<T>, 'name' | 'pluginDir'>} UmzeptionLookupDefinition
 */

/**
 * @template T
 * @param {UmzeptionLookupDefinition<T>} config
 * @param {T} context
 * @returns {Promise<Array<import('umzug').RunnableMigration<T>>>}
 */
export async function umzeptionLookup (config, context) {
  const {
    dependencies,
    name = 'main',
    pluginDir = process.cwd(),
    ...definitionConfig
  } = config;

  /** @type {import('./dependencies.js').UmzeptionDefinition<T>[]} */
  const definitions = dependencies
    ? await loadDependencies(dependencies, { cwd: pluginDir })
    : [];

  const result = await Promise.all(definitions.map(definition => resolveDefinition(definition, context)));

  return [
    ...result.flat(),
    ...(await resolveDefinition(
      {
        name,
        pluginDir,
        ...definitionConfig,
      },
      context
    )),
  ];
}
