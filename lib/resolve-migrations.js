import path from 'node:path';

import { globby } from 'globby';
import { importAbsolutePath } from 'plugin-importer';

/**
 * Default lexicographic sort applied to migration file paths.
 *
 * globby does not guarantee an order, and Umzug only applies its own
 * `paths.sort()` to the `glob` input path — not to a pre-built
 * `RunnableMigration[]`. We sort here so consumers see the same order
 * regardless of filesystem. Receives the context arg for signature
 * parity with custom `sortFiles` callbacks; the default ignores it.
 *
 * @param {string[]} files
 * @param {{ pluginDir: string }} [_context]
 * @returns {string[]}
 */
export function sortMigrationFiles (files, _context) {
  return [...files].sort();
}

/**
 * @template {import('./advanced-types.d.ts').AnyUmzeptionContext} T
 * @param {Pick<import('./advanced-types.d.ts').UmzeptionDefinition<T>, 'glob' | 'name' | 'noPrefix' | 'pluginDir'>} definition
 * @param {T} _context
 * @param {boolean} [noop] - if set then the up/down migrations will have no operation
 * @param {((files: string[], context: { pluginDir: string }) => string[]) | undefined} [sortFiles] -
 *   custom sort transformer. Receives absolute paths and `{ pluginDir }` so the
 *   shared prefix can be stripped before length- or numeric-aware comparisons.
 *   Defaults to {@link sortMigrationFiles}. Use `(files) => files` to opt out.
 * @returns {Promise<import('umzug').RunnableMigration<T>[]>}
 */
export async function resolveMigrations (definition, _context, noop = false, sortFiles) {
  const {
    glob,
    name: definitionName,
    noPrefix,
    pluginDir,
  } = definition;

  const sortFn = sortFiles ?? sortMigrationFiles;
  const files = sortFn(await globby(glob, { cwd: pluginDir, absolute: true }), { pluginDir });

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

    const name = (noPrefix ? '' : definitionName + '|') + path.basename(file);

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
    .catch(
      /** @param {unknown} cause */
      cause => {
        throw new Error('Failed to resolve migrations', { cause });
      }
    );
}
