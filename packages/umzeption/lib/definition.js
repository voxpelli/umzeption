import { isStringArray } from '@voxpelli/typed-utils';
import { assertToBePluginDefinition } from 'plugin-importer';

/**
 * @param {unknown} value
 * @returns {import('./advanced-types.d.ts').UmzeptionDefinition}
 */
export function ensureUmzeptionDefinition (value) {
  try {
    assertToBePluginDefinition(value);
  } catch (cause) {
    throw new Error('Invalid plugin definition', { cause });
  }

  const {
    name,
    pluginDir,
    ...umzeptionExtras
  } = value;

  if (!name) {
    throw new TypeError('Expected umzeption definition to have non-empty "name" property');
  }
  if (!pluginDir) {
    throw new TypeError(`Expected umzeption definition "${name}" to have non-empty "pluginDir" property`);
  }
  if (!('glob' in umzeptionExtras)) {
    throw new TypeError(`Expected umzeption definition "${name}" to have a "glob" property`);
  }
  if (!('installSchema' in umzeptionExtras)) {
    throw new TypeError(`Expected umzeption definition "${name}" to have an "installSchema" property`);
  }

  const { glob, installSchema, uninstallSchema, ...extras } = /** @type {{ glob: unknown, installSchema: unknown, uninstallSchema?: unknown }} */ (umzeptionExtras);

  if (!isStringArray(glob)) {
    throw new TypeError(`Expected umzeption definition "${name}" "glob" property to be a string array`);
  }
  if (typeof installSchema !== 'function') {
    throw new TypeError(`Expected umzeption definition "${name}" "installSchema" property to be a function`);
  }
  if (uninstallSchema !== undefined && typeof uninstallSchema !== 'function') {
    throw new TypeError(`Expected umzeption definition "${name}" "uninstallSchema" property to be a function`);
  }

  // Ensure that we have async methods here
  /** @type {import('umzug').MigrationFn<import('./advanced-types.d.ts').AnyUmzeptionContext>} */
  const asyncInstallSchema = async (...args) => installSchema.call(value, ...args);

  /** @type {import('./advanced-types.d.ts').UmzeptionDefinition} */
  const result = {
    name,
    pluginDir,
    glob,
    installSchema: asyncInstallSchema,
    ...(uninstallSchema && { uninstallSchema: async (...args) => uninstallSchema.call(value, ...args) }),
    ...extras,
  };

  return result;
}
