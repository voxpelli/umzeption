import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Umzug } from 'umzug';

import { umzeption } from './main.js';

/** @import { AnyUmzeptionContext, CreateUmzeptionOptions, UmzeptionInstance } from './advanced-types.d.ts' */

/**
 * Single setup point for umzeption. Returns the upgrade-mode Umzug
 * (eager), a lazily-built install-mode Umzug (via getter), and a
 * `runAsCLI` method that adds an `install` subcommand on top of
 * Umzug's built-in CLI (`up`/`down`/`pending`/`create`).
 *
 * The `install` subcommand dispatches against the install-mode Umzug,
 * which runs each dependency's `installSchema()` and marks all
 * existing migrations as already-executed (umzeption's "fresh
 * database" mode). Any `install` field inside `options.umzeption` is
 * overridden by the factory — use `instance.installUmzug` for
 * install-mode programmatic access.
 *
 * `install` is implemented by translating argv to `['up', ...rest]`
 * against the install-mode Umzug, which has two user-visible
 * consequences: `umzeption install --help` prints `up`'s help (no
 * dedicated install-mode help text), and `up`-only flags
 * (`--to`, `--step`, `--migrations`) pass through unchanged — most
 * are nonsensical for install mode. In the normal case, run
 * `install` with no further flags. (Umzug v3's `runAsCLI` also calls
 * `process.exit` after execution, so the returned `Promise<boolean>`
 * resolution is effectively dead code in CLI contexts.)
 *
 * Destructuring caveat: `const { runAsCLI } = createUmzeption(...)`
 * keeps working (the install dispatch uses a closure, not `this`).
 * But `const { installUmzug } = createUmzeption(...)` evaluates the
 * lazy getter immediately, defeating the laziness — reach for
 * `instance.installUmzug` instead when you want the lazy semantics.
 *
 * @template {AnyUmzeptionContext} T
 * @param {CreateUmzeptionOptions<T>} options
 * @returns {UmzeptionInstance<T>}
 */
export function createUmzeption (options) {
  const umzug = buildUmzug(options, false);
  /** @type {Umzug<T> | undefined} */
  let installUmzugCache;

  // Closure-captured (NOT `this.installUmzug`) so destructured
  // `const { runAsCLI } = createUmzeption({...})` keeps working.
  const getInstallUmzug = () => (installUmzugCache ??= buildUmzug(options, true));

  return {
    umzug,
    get installUmzug () {
      return getInstallUmzug();
    },
    async runAsCLI (argv = process.argv.slice(2)) {
      const [first, ...rest] = argv;
      if (first === 'install') {
        return getInstallUmzug().runAsCLI(['up', ...rest]);
      }
      return umzug.runAsCLI(argv);
    },
  };
}

/**
 * @template {AnyUmzeptionContext} T
 * @param {CreateUmzeptionOptions<T>} options
 * @param {boolean} install
 * @returns {Umzug<T>}
 */
function buildUmzug ({ context, create, logger, storage, umzeption: umzeptionConfig }, install) {
  const { cwd: rawCwd, meta } = umzeptionConfig;

  let inferredFolder;
  if (meta) {
    try {
      inferredFolder = path.dirname(fileURLToPath(meta.url));
    } catch (cause) {
      throw new Error(
        `createUmzeption: could not derive folder from meta.url (${meta.url}); pass umzeption.cwd or create.folder explicitly`,
        { cause }
      );
    }
  } else {
    inferredFolder = rawCwd ?? process.cwd();
  }

  // Avoid the spread-with-undefined footgun: `{ a: 1, ...{ a: undefined } }`
  // yields `{ a: undefined }`, which would re-introduce umzug's "Couldn't
  // infer a directory" error that this default was added to prevent.
  const mergedCreate = { ...create };
  if (mergedCreate.folder === undefined) mergedCreate.folder = inferredFolder;

  // `install` overrides any `install` field caller put in umzeptionConfig.
  return new Umzug({
    migrations: umzeption({ ...umzeptionConfig, install }),
    context,
    storage,
    logger,
    create: mergedCreate,
  });
}
