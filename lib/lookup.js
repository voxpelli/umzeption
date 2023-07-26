import { loadDependencies } from './dependencies.js';
import { resolveDefinition } from './resolve-definition.js';

/**
 * @template T
 * @param {import('./dependencies.js').UmzeptionDefinition<T>} config
 * @param {T} context
 * @returns {Promise<Array<import('umzug').RunnableMigration<T>>>}
 */
export async function umzeptionLookup (config, context) {
  const {
    dependencies,
    pluginDir,
  } = config;

  /** @type {import('./dependencies.js').UmzeptionDefinition<T>[]} */
  const definitions = dependencies
    ? await loadDependencies(dependencies, { cwd: pluginDir })
    : [];

  const result = await Promise.all(definitions.map(definition => resolveDefinition(definition, context)));

  return [
    ...result.flat(),
    ...(await resolveDefinition(config, context)),
  ];
}
