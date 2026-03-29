import { readdir } from 'node:fs/promises';
import path from 'node:path';

import { importAbsolutePath } from 'plugin-importer';

/** @type {((pattern: string, options: { cwd: string }) => AsyncIterable<string>) | undefined} */
let fsGlob;

try {
  // fs.glob is available in Node 22+, not in Node 20
  const fs = await import('node:fs/promises');
  if ('glob' in fs && typeof fs.glob === 'function') {
    fsGlob = /** @type {typeof fsGlob} */ (fs.glob);
  }
} catch {
  // fs.glob unavailable — will use readdirGlob fallback
}

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
    const subdir = lastSlash !== -1 ? pattern.slice(0, lastSlash) : '.';
    const filePattern = lastSlash !== -1 ? pattern.slice(lastSlash + 1) : pattern;
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
  if (fsGlob) {
    const files = [];
    for (const pattern of patterns) {
      // fs.glob returns paths relative to cwd; resolve to absolute
      for await (const file of fsGlob(pattern, { cwd })) {
        files.push(path.resolve(cwd, file));
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

  /** @type {Set<string>} */
  const seenIds = new Set();

  return Promise.all(files.map(async file => {
    const fileName = path.basename(file);

    if (/[|:]/.test(fileName)) {
      throw new TypeError(`Invalid migration file name "${fileName}": must not contain "|" or ":" (reserved delimiters)`);
    }

    const migrationId = (noPrefix ? '' : definitionName + '|') + fileName;

    if (seenIds.has(migrationId)) {
      throw new TypeError(`Duplicate migration ID "${migrationId}" from "${file}"`);
    }
    seenIds.add(migrationId);

    /** @type {unknown} */
    const migration = await importAbsolutePath(file).catch(
      /** @param {unknown} cause */
      cause => {
        throw new Error(`Failed to import migration "${migrationId}" from "${file}"`, { cause });
      }
    );

    if (!migration || typeof migration !== 'object') {
      throw new TypeError(`Invalid migration "${migrationId}": expected an object, got ${migration === null ? 'null' : typeof migration}`);
    }

    if (!('down' in migration)) {
      throw new TypeError(`Invalid migration "${migrationId}": missing "down" export`);
    }
    if (!('up' in migration)) {
      throw new TypeError(`Invalid migration "${migrationId}": missing "up" export`);
    }

    const { down, up } = migration;

    if (typeof down !== 'function') {
      throw new TypeError(`Invalid migration "${migrationId}": "down" export must be a function, got ${typeof down}`);
    }
    if (typeof up !== 'function') {
      throw new TypeError(`Invalid migration "${migrationId}": "up" export must be a function, got ${typeof up}`);
    }

    const name = migrationId;

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
        throw new Error(`Failed to resolve migrations for definition "${definitionName}"`, { cause });
      }
    );
}
