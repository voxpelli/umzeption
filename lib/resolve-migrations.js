import path from 'node:path';

import { globby } from 'globby';
import { importAbsolutePath } from 'plugin-importer';

/**
 * Default lexicographic sort applied to migration file paths.
 *
 * globby does not guarantee an order. We sort here so consumers see
 * the same execution order regardless of filesystem.
 *
 * @param {string[]} files
 * @param {{ pluginDir: string }} [_context]
 * @returns {string[]}
 */
export function sortMigrationFiles (files, _context) {
  return [...files].sort();
}

/**
 * Validate that a custom `sortFiles` callback returned a permutation of its
 * input. Catches the data-loss class of bugs (drops, duplicates, synthesized
 * paths) at the boundary before bogus paths flow into the importer.
 *
 * @param {string[]} input
 * @param {unknown} result
 * @param {string} definitionName
 * @returns {string[]}
 */
export function validateSortResult (input, result, definitionName) {
  if (!Array.isArray(result)) {
    throw new TypeError(
      `sortFiles for "${definitionName}" must return an array, got ${typeof result}`
    );
  }
  if (result.length !== input.length) {
    throw new Error(
      `sortFiles for "${definitionName}" returned ${result.length} file(s) but received ${input.length}; the callback must return a permutation of its input`
    );
  }
  const inputSet = new Set(input);
  for (const file of result) {
    if (!inputSet.has(file)) {
      throw new Error(
        `sortFiles for "${definitionName}" returned a path not present in the input: "${file}"`
      );
    }
  }
  return result;
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

  /** @returns {Promise<string[]>} */
  const resolveFiles = async () => {
    try {
      const discovered = await globby(glob, { cwd: pluginDir, absolute: true });
      return validateSortResult(discovered, sortFn(discovered, { pluginDir }), definitionName);
    } catch (cause) {
      throw new Error(
        `Failed to resolve migrations for "${definitionName}" (pluginDir: ${pluginDir})`,
        { cause }
      );
    }
  };

  const files = await resolveFiles();

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
        throw new Error(
          `Failed to resolve migration file in "${definitionName}" (pluginDir: ${pluginDir})`,
          { cause }
        );
      }
    );
}
