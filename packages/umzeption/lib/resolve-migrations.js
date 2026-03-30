import { readdir } from 'node:fs/promises';
import path from 'node:path';

import { importAbsolutePath } from 'plugin-importer';

/** @type {((pattern: string, options: { cwd: string }) => AsyncIterable<string>) | undefined} */
let fsGlob;

try {
  const fs = await import('node:fs/promises');

  if ('glob' in fs && typeof fs.glob === 'function') {
    fsGlob = /** @type {typeof fsGlob} */ (fs.glob);
  }
} catch {
  // fs.glob unavailable — will use readdirGlob fallback
}

/**
 * Compile a glob-like pattern into a regex for matching filenames.
 *
 * @param {string} pattern
 * @returns {RegExp}
 */
function compilePattern (pattern) {
  return new RegExp('^' + pattern.replaceAll(/[.+^${}()|[\]\\]/g, '\\$&').replaceAll('*', '[^/]*') + '$');
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
  /** @type {string[]} */
  const results = [];
  for (const pattern of patterns) {
    const lastSlash = pattern.lastIndexOf('/');
    const subdir = lastSlash !== -1 ? pattern.slice(0, lastSlash) : '.';
    const filePattern = lastSlash !== -1 ? pattern.slice(lastSlash + 1) : pattern;
    const fileRegex = compilePattern(filePattern);
    const targetDir = path.join(cwd, subdir);
    try {
      const entries = await readdir(targetDir);
      for (const entry of entries) {
        if (fileRegex.test(entry)) {
          results.push(path.join(targetDir, entry));
        }
      }
    } catch (err) {
      if (err instanceof Error && 'code' in err && /** @type {{ code: string }} */ (err).code === 'ENOENT') continue;
      throw err;
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
    /** @type {string[]} */
    const files = [];
    for (const pattern of patterns) {
      // fs.glob returns paths relative to cwd; resolve to absolute
      for await (const file of fsGlob(pattern, { cwd })) {
        files.push(path.resolve(cwd, file));
      }
    }
    return files;
  }
  if (!process.env['UMZEPTION_SUPPRESS_WARNINGS']) {
    for (const pattern of patterns) {
      if (pattern.includes('**')) {
        process.emitWarning(
          `Glob pattern "${pattern}" uses "**" which requires Node 22+. ` +
          'The fallback only supports single-directory patterns like "dir/*.js". ' +
          'Set UMZEPTION_SUPPRESS_WARNINGS=1 to silence this warning.',
          'UmzeptionWarning'
        );
        break;
      }
    }
  }
  return readdirGlob(patterns, cwd);
}

/**
 * @template T
 * @param {Promise<T>} promise
 * @param {number} ms
 * @param {string} label
 * @returns {Promise<T>}
 */
async function withTimeout (promise, ms, label) {
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer;

  try {
    return await Promise.race([
      promise,
      new Promise((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error(`Migration "${label}" timed out after ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @template {import('./advanced-types.d.ts').AnyUmzeptionContext} T
 * @param {Pick<import('./advanced-types.d.ts').UmzeptionDefinition<T>, 'glob' | 'name' | 'noPrefix' | 'pluginDir'>} definition
 * @param {boolean} [noop] - if set then the up/down migrations will have no operation
 * @param {{ timeout?: number }} [options]
 * @returns {Promise<import('umzug').RunnableMigration<T>[]>}
 */
export async function resolveMigrations (definition, noop = false, options) {
  const timeout = options?.timeout;

  if (timeout !== undefined && (typeof timeout !== 'number' || !Number.isFinite(timeout) || timeout <= 0)) {
    throw new TypeError(`Invalid timeout value: ${timeout}. Must be a positive finite number.`);
  }
  const {
    glob,
    name: definitionName,
    noPrefix,
    pluginDir,
  } = definition;

  const files = (await resolveGlob(glob, pluginDir)).sort();

  if (files.length === 0 && glob.length > 0 && !process.env['UMZEPTION_SUPPRESS_WARNINGS']) {
    process.emitWarning(
      `No migration files matched glob patterns [${glob.join(', ')}] in "${pluginDir}" for definition "${definitionName}". ` +
      'Set UMZEPTION_SUPPRESS_WARNINGS=1 to silence this warning.',
      'UmzeptionWarning'
    );
  }

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
        const code = cause instanceof Error && 'code' in cause ? /** @type {string} */ (cause.code) : '';
        const hint = code === 'ERR_REQUIRE_ESM'
          ? ' Hint: this file uses CommonJS require() but the migration is an ES module. Use import() or rename to .mjs.'
          : '';
        throw new Error(`Failed to import migration "${migrationId}" from "${file}".${hint}`, { cause });
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

    /** @type {import('umzug').RunnableMigration<T>} */
    const result = {
      name: migrationId,
      path: file,
      up: noop
        ? async () => {}
        : async ({ context }) => {
          /** @type {Promise<unknown>} */
          const p = up.call(migration, ({ path: file, name: migrationId, context }));
          return timeout ? withTimeout(p, timeout, migrationId) : p;
        },
      down: noop
        ? async () => {}
        : async ({ context }) => {
          /** @type {Promise<unknown>} */
          const p = down.call(migration, ({ path: file, name: migrationId, context }));
          return timeout ? withTimeout(p, timeout, migrationId) : p;
        },
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
