import path from 'node:path';

import { globby } from 'globby';

/**
 * @template T
 * @param {import('./dependencies.js').UmzeptionDefinition<T>} definition
 * @param {T} _context
 * @returns {Promise<import('umzug').RunnableMigration<T>[]>}
 */
export async function resolveDefinition ({ filePath, glob, name: definitionName }, _context) {
  const cwd = path.dirname(filePath);

  const files = await globby(glob, { cwd, absolute: true });

  return Promise.all(files.map(async file => {
    const migration = await import(file);

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