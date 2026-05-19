import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Umzug } from 'umzug';

import { umzeption } from './main.js';

/**
 * Build an Umzug instance pre-wired with umzeption migration resolution.
 *
 * Consumers can then call `.runAsCLI()` on the result to get umzug's
 * `create`/`up`/`down`/`pending` subcommands -- including the
 * `allowConfusingOrdering` safety check on `create`, which catches
 * filenames that would sort before existing migrations.
 *
 * `create.folder` defaults to the directory derived from the umzeption
 * config's `meta`/`cwd` (mirrors lookup.js). This eliminates umzug's
 * "Couldn't infer a directory to generate migration file in" error
 * that otherwise fires on the very first `create` in a fresh project,
 * before any migrations exist for umzug to infer the folder from.
 *
 * @template {import('./advanced-types.d.ts').AnyUmzeptionContext} T
 * @param {object} options
 * @param {import('./advanced-types.d.ts').UmzeptionLookupOptions<T>} options.umzeption - umzeption config (dependencies, glob, sortFiles, install, meta/cwd, ...)
 * @param {T} options.context
 * @param {import('umzug').UmzugStorage<T>} options.storage
 * @param {ConstructorParameters<typeof Umzug<T>>[0]['logger']} [options.logger]
 * @param {ConstructorParameters<typeof Umzug<T>>[0]['create']} [options.create] - forwarded to Umzug; caller's `folder`/`template` win over umzeption defaults
 * @returns {Umzug<T>}
 */
export function createUmzeptionUmzug ({ context, create, logger, storage, umzeption: umzeptionConfig }) {
  const { cwd: rawCwd, meta } = umzeptionConfig;
  const inferredFolder = meta
    ? path.dirname(fileURLToPath(meta.url))
    : rawCwd ?? process.cwd();

  return new Umzug({
    migrations: umzeption(umzeptionConfig),
    context,
    storage,
    logger,
    create: { folder: inferredFolder, ...create },
  });
}
