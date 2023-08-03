import { assertToBePluginDefinition } from 'plugin-importer';

import { isStringArray } from './utils.js';

/**
 * @template T
 * @typedef UmzeptionDefinition
 * @property {string} name
 * @property {string} pluginDir
 * @property {string[]} glob
 * @property {import('umzug').MigrationFn<T>} installSchema
 * @property {string[]} [dependencies]
 */

/**
 * @param {unknown} value
 * @returns {UmzeptionDefinition<unknown>}
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

  const { glob, installSchema, ...extras } = umzeptionExtras;

  if (!isStringArray(glob)) {
    throw new TypeError(`Expected umzeption definition "${name}" "glob" property to be a string array`);
  }
  if (typeof installSchema !== 'function') {
    throw new TypeError(`Expected umzeption definition "${name}" "installSchema" property to be a function`);
  }

  // Ensure that we have an async method here
  /** @type {import('umzug').MigrationFn<unknown>} */
  const asyncInstallSchema = async (...args) => installSchema.call(value, ...args);

  /** @type {UmzeptionDefinition<unknown>} */
  const result = {
    name,
    pluginDir,
    glob,
    installSchema: asyncInstallSchema,
    ...extras,
  };

  return result;
}

/**
 * @param {unknown} value
 * @returns {asserts value is UmzeptionDefinition<unknown>}
 */
export function assertToBeUmzeptionDefinition (value) {
  ensureUmzeptionDefinition(value);
}

/**
 * @param {unknown} value
 * @returns {value is UmzeptionDefinition<unknown>}
 */
export function isUmzeptionDefinition (value) {
  try {
    ensureUmzeptionDefinition(value);
    return true;
  } catch (err) {
    if (err instanceof TypeError) {
      return false;
    }
    throw err;
  }
}
