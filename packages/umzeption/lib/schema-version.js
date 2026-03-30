import { createHash } from 'node:crypto';

import { resolveMigrations } from './resolve-migrations.js';

/**
 * Compute a SHA-256 checksum of all migration file names for the given definitions.
 * Useful for detecting schema drift between environments.
 *
 * @param {Pick<import('./advanced-types.d.ts').UmzeptionDefinition, 'glob' | 'name' | 'noPrefix' | 'pluginDir'>[]} definitions
 * @returns {Promise<string>}
 */
export async function computeSchemaChecksum (definitions) {
  /** @type {string[]} */
  const allNames = [];

  for (const definition of definitions) {
    const migrations = await resolveMigrations(definition, true);
    for (const m of migrations) {
      allNames.push(m.name);
    }
  }

  allNames.sort();

  return createHash('sha256')
    .update(allNames.join('\n'))
    .digest('hex');
}
