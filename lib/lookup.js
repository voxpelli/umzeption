import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadDependencies } from './dependencies.js';
import { resolveMigrations } from './resolve-migrations.js';

/**
 * @typedef UmzeptionLookupOptionsExtra
 * @property {string|undefined} [cwd]
 * @property {boolean} [install]
 * @property {ImportMeta} [meta]
 * @property {boolean} [noop]
 */

/**
 * @template T
 * @typedef {import('./utils.js').PartialKeys<import('./definition.js').UmzeptionDefinition<T>, 'glob'|'installSchema'|'name', 'pluginDir'> & UmzeptionLookupOptionsExtra} UmzeptionLookupOptions
 */

/**
 * @template T
 * @param {UmzeptionLookupOptions<T>} options
 * @param {T} context
 * @returns {Promise<Array<import('umzug').RunnableMigration<T>>>}
 */
export async function umzeptionLookup (options, context) {
  const {
    cwd: rawCwd,
    dependencies,
    install = false,
    meta,
    noop: noopOption = false,
    ...mainDefinitionExtras
  } = options;

  if (meta && rawCwd) {
    throw new Error('Can not provide both cwd and meta at once');
  }

  const cwd = meta
    ? path.dirname(fileURLToPath(meta.url))
    : rawCwd || process.cwd();

  const noop = install || noopOption;

  /** @type {import('./definition.js').UmzeptionDefinition<T>} */
  const mainDefinition = {
    glob: [],
    installSchema: async () => {},
    name: 'main',
    pluginDir: cwd,
    ...mainDefinitionExtras,
  };

  /** @type {import('./definition.js').UmzeptionDefinition<T>[]} */
  const dependencyDefinitions = dependencies
    ? await loadDependencies(dependencies, { cwd })
    : [];

  const definitions = [...dependencyDefinitions, mainDefinition];

  const installations = definitions.map(definition => {
    // ':' instead of '|' to differentiate against migrations
    const name = definition.name + ':install';

    /** @type {import('umzug').RunnableMigration<T>} */
    const result = {
      name,
      up: install
        ? async ({ context }) => definition.installSchema(({ name, context }))
        : async () => {},
    };

    return result;
  });

  const migrations = await Promise.all(definitions.map(definition => {
    return resolveMigrations(definition, context, noop);
  }));

  return [
    ...installations,
    ...migrations.flat(),
  ];
}
