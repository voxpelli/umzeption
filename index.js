import path from 'node:path';

import { ModuleImporter } from '@humanwhocodes/module-importer';
import { globby } from 'globby';

import { loadDependencies } from './lib/dependencies.js';

/**
 * @template T
 * @param {import('./lib/dependencies.js').UmzeptionDefinition<T>} definition
 * @param {T} _context
 * @returns {Promise<import('umzug').RunnableMigration<T>[]>}
 */
async function resolveDefinition ({ filePath, glob, name: definitionName }, _context) {
  const cwd = path.dirname(filePath);

  const files = await globby(glob, { cwd, absolute: true });
  const importer = new ModuleImporter(cwd);

  return Promise.all(files.map(async file => {
    const migration = await importer.import(file);

    if (!migration || typeof migration !== 'object') {
      throw new TypeError('Invalid migration, expected an object');
    }

    if (!('down' in migration)) {
      throw new TypeError('Invalid migration, expected an "down" property');
    }
    if (!('up' in migration)) {
      throw new TypeError('Invalid migration, expected an "up" property');
    }

    const { down, up } = migration;

    if (typeof down !== 'function') {
      throw new TypeError('Invalid migration, expected a "down" method');
    }
    if (typeof up !== 'function') {
      throw new TypeError('Invalid migration, expected a "up" method');
    }

    const name = definitionName + '|' + path.basename(file);

    /** @type {import('umzug').RunnableMigration<T>} */
    const result = {
      name,
      path: file,
      up: async ({ context }) => up.call(migration, ({ path: file, name, context })),
      down: async ({ context }) => down.call(migration, ({ path: file, name, context })),
    };

    return result;
  }));
}

/**
 * @template T
 * @param {import('./lib/dependencies.js').UmzeptionDefinition<T>} config
 * @param {T} context
 * @returns {Promise<Array<import('umzug').RunnableMigration<T>>>}
 */
async function umzeptionLookup (config, context) {
  const {
    dependencies,
    filePath,
  } = config;

  /** @type {import('./lib/dependencies.js').UmzeptionDefinition<T>[]} */
  const definitions = dependencies
    ? await loadDependencies(dependencies, { cwd: path.dirname(filePath) })
    : [];

  const result = await Promise.all(definitions.map(definition => resolveDefinition(definition, context)));

  return [
    ...result.flat(),
    ...(await resolveDefinition(config, context)),
  ];
}

// TODO: Add integration tests that runs this against umzug and with fake modules
/**
 * @template T
 * @param {import('./lib/dependencies.js').UmzeptionDefinition<T>} config
 * @returns {(context: T) => Promise<import('umzug').InputMigrations<T>>}
 */
export function umzeption (config) {
  // TODO: Make name and filePath optional and resolve here instead?
  return async context => umzeptionLookup(config, context);
}
