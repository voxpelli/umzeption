import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadDependencies } from './dependencies.js';
import { resolveMigrations } from './resolve-migrations.js';

/** @import { AnyUmzeptionContext, UmzeptionDefinition, UmzeptionLookupOptions } from './advanced-types.d.ts' */

/**
 * @template {AnyUmzeptionContext} T
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
    sortFiles,
    ...mainDefinitionExtras
  } = options;

  if (meta && rawCwd) {
    throw new Error('Can not provide both cwd and meta at once');
  }

  const cwd = meta
    ? path.dirname(fileURLToPath(meta.url))
    : rawCwd || process.cwd();

  const noop = install || noopOption;

  /** @type {UmzeptionDefinition<T>} */
  const mainDefinition = {
    glob: [],
    installSchema: async () => {},
    name: 'main',
    noPrefix: true,
    pluginDir: cwd,
    sortFiles,
    ...mainDefinitionExtras,
  };

  /** @type {UmzeptionDefinition<T>[]} */
  const dependencyDefinitions = dependencies
    ? await loadDependencies(dependencies, { cwd })
    : [];

  const definitions = [...dependencyDefinitions, mainDefinition];

  // Guard before the `??` precedence below collapses any non-undefined falsy
  // value into a silent default (null) or a cryptic TypeError (false/0/'').
  if (sortFiles !== undefined && typeof sortFiles !== 'function') {
    throw new TypeError(
      `sortFiles option must be a function or undefined, got ${typeof sortFiles}`
    );
  }

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
    if (definition.sortFiles !== undefined && typeof definition.sortFiles !== 'function') {
      throw new TypeError(
        `sortFiles for dependency "${definition.name}" must be a function or undefined, got ${typeof definition.sortFiles}`
      );
    }
    // Per-dependency `sortFiles` (declared by the dep author) takes precedence
    // over the top-level `sortFiles` (declared by the consuming application).
    return resolveMigrations(definition, context, noop, definition.sortFiles ?? sortFiles);
  }));

  return [
    ...installations,
    ...migrations.flat(),
  ];
}
