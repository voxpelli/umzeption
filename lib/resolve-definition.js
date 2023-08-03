import path from 'node:path';

import { globby } from 'globby';
import { importAbsolutePath } from 'plugin-importer';

/**
 * @template T
 * @param {Pick<import('./dependencies.js').UmzeptionDefinition<T>, 'glob' | 'name' | 'pluginDir'>} definition
 * @param {T} _context
 * @param {boolean} [noop] - if set then the up/down migrations will have no operation
 * @returns {Promise<import('umzug').RunnableMigration<T>[]>}
 */
export async function resolveMigrations ({ glob, name: definitionName, pluginDir }, _context, noop = false) {
  const files = await globby(glob, { cwd: pluginDir, absolute: true });

  return Promise.all(files.map(async file => {
    /** @type {unknown} */
    const migration = await importAbsolutePath(file);

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
      up: noop
        ? async () => {}
        : async ({ context }) => up.call(migration, ({ path: file, name, context })),
      down: noop
        ? async () => {}
        : async ({ context }) => down.call(migration, ({ path: file, name, context })),
    };

    return result;
  }))
    // eslint-disable-next-line promise/prefer-await-to-then
    .catch(cause => {
      throw new Error('Failed to resolve migrations', { cause });
    });
}
