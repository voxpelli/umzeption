import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadDependencies } from './dependencies.js';
import { resolveDefinition } from './resolve-definition.js';

/**
 * @template {object} T
 * @template {keyof T} KeysOmit
 * @template {KeysOmit} [KeysPick=KeysOmit]
 * @typedef {Omit<T, KeysOmit> & Partial<Pick<T, KeysPick>>} PartialKeys
 */

/**
 * @typedef UmzeptionLookupOptionsExtra
 * @property {string|undefined} [cwd]
 * @property {ImportMeta} [meta]
 */

/**
 * @template T
 * @typedef {PartialKeys<import('./dependencies.js').UmzeptionDefinition<T>, 'name' | 'pluginDir', 'name'> & UmzeptionLookupOptionsExtra} UmzeptionLookupOptions
 */

/**
 * @template T
 * @param {UmzeptionLookupOptions<T>} options
 * @param {T} context
 * @returns {Promise<Array<import('umzug').RunnableMigration<T>>>}
 */
export async function umzeptionLookup (options, context) {
  const {
    cwd: rawCwd,
    dependencies,
    meta,
    name = 'main',
    ...definitionConfig
  } = options;

  if (meta && rawCwd) {
    throw new Error('Can not provide both cwd and meta at once');
  }

  const cwd = meta
    ? path.dirname(fileURLToPath(meta.url))
    : rawCwd || process.cwd();

  /** @type {import('./dependencies.js').UmzeptionDefinition<T>[]} */
  const definitions = dependencies
    ? await loadDependencies(dependencies, { cwd })
    : [];

  const result = await Promise.all(definitions.map(definition => resolveDefinition(definition, context)));

  return [
    ...result.flat(),
    ...(await resolveDefinition(
      {
        name,
        pluginDir: cwd,
        ...definitionConfig,
      },
      context
    )),
  ];
}
