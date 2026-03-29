import { readdir } from 'node:fs/promises';
import path from 'node:path';

// @ts-ignore -- fs.glob is available in Node 22+, undefined in Node 20
import { glob as fsGlob } from 'node:fs/promises';
import { importAbsolutePath } from 'plugin-importer';

/**
 * Simple pattern matching for a single filename (no path separators).
 * Supports `*` as wildcard matching any sequence of non-separator chars.
 *
 * @param {string} pattern
 * @param {string} name
 * @returns {boolean}
 */
function matchSimplePattern (pattern, name) {
  const regex = new RegExp('^' + pattern.replaceAll(/[.+^${}()|[\]\\]/g, '\\$&').replaceAll('*', '[^/]*') + '$');
  return regex.test(name);
}

/**
 * Fallback glob for Node 20 using fs.readdir.
 * Supports patterns like `dir/*.js`, `dir/sub/*.js`, `*.js`.
 *
 * @param {string[]} patterns
 * @param {string} cwd
 * @returns {Promise<string[]>}
 */
async function readdirGlob (patterns, cwd) {
  const results = [];
  for (const pattern of patterns) {
    const lastSlash = pattern.lastIndexOf('/');
    const subdir = lastSlash >= 0 ? pattern.slice(0, lastSlash) : '.';
    const filePattern = lastSlash >= 0 ? pattern.slice(lastSlash + 1) : pattern;
    const targetDir = path.join(cwd, subdir);
    try {
      const entries = await readdir(targetDir);
      for (const entry of entries) {
        if (matchSimplePattern(filePattern, entry)) {
          results.push(path.join(targetDir, entry));
        }
      }
    } catch {
      // Directory doesn't exist — skip silently
    }
  }
  return results;
}

/**
 * @param {string[]} patterns
 * @param {string} cwd
 * @returns {Promise<string[]>}
 */
async function resolveGlob (patterns, cwd) {
  if (typeof fsGlob === 'function') {
    const files = [];
    for (const pattern of patterns) {
      // @ts-ignore -- fsGlob is fs.glob, available Node 22+
      for await (const file of fsGlob(pattern, { cwd, absolute: true })) {
        files.push(file);
      }
    }
    return files;
  }
  return readdirGlob(patterns, cwd);
}

/**
 * @template {import('./advanced-types.d.ts').AnyUmzeptionContext} T
 * @param {Pick<import('./advanced-types.d.ts').UmzeptionDefinition<T>, 'glob' | 'name' | 'noPrefix' | 'pluginDir'>} definition
 * @param {boolean} [noop] - if set then the up/down migrations will have no operation
 * @returns {Promise<import('umzug').RunnableMigration<T>[]>}
 */
export async function resolveMigrations (definition, noop = false) {
  const {
    glob,
    name: definitionName,
    noPrefix,
    pluginDir,
  } = definition;

  const files = (await resolveGlob(glob, pluginDir)).sort();

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
