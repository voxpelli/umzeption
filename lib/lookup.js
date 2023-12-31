import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadDependencies } from './dependencies.js';
import { resolveMigrations } from './resolve-migrations.js';

/**
 * @template {import('./advanced-types.d.ts').AnyUmzeptionContext} T
 * @param {import('./advanced-types.d.ts').UmzeptionLookupOptions<T>} options
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

  /** @type {import('./advanced-types.d.ts').UmzeptionDefinition<T>} */
  const mainDefinition = {
    glob: [],
    installSchema: async () => {},
    name: 'main',
    noPrefix: true,
    pluginDir: cwd,
    ...mainDefinitionExtras,
  };

  /** @type {import('./advanced-types.d.ts').UmzeptionDefinition<T>[]} */
  const dependencyDefinitions = dependencies
    ? await loadDependencies(dependencies, { cwd })
    : [];

  const definitions = [...dependencyDefinitions, mainDefinition];

  const installations = definitions.map(definition => {
    // ':' instead of '|' to differentiate against migrations, and keep ':' on prefix less to avoid clash with file names
    const name = (definition.noPrefix ? '' : definition.name) + ':install';

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
