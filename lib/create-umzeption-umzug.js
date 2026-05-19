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
 * @template {import('./advanced-types.d.ts').AnyUmzeptionContext} T
 * @param {object} options
 * @param {import('./advanced-types.d.ts').UmzeptionLookupOptions<T>} options.umzeption - umzeption config (dependencies, glob, install, sort, ...)
 * @param {T} options.context
 * @param {import('umzug').UmzugStorage<T>} options.storage
 * @param {ConstructorParameters<typeof Umzug<T>>[0]['logger']} [options.logger]
 * @returns {Umzug<T>}
 */
export function createUmzeptionUmzug ({ context, logger, storage, umzeption: umzeptionConfig }) {
  return new Umzug({
    migrations: umzeption(umzeptionConfig),
    context,
    storage,
    logger,
  });
}
