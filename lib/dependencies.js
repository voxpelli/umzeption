import {
  assertToBePluginDefinition,
  getExtensionlessBasename,
  loadPlugins,
  resolvePluginsInOrder,
} from 'plugin-importer';
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
function ensureUmzeptionDefinition (value) {
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

  if (
    !name ||
    !pluginDir ||
    !('glob' in umzeptionExtras) ||
    !('installSchema' in umzeptionExtras)
  ) {
    throw new TypeError('Expected umzeption definition to have non-empty name and pluginDir');
  }

  const { glob, installSchema, ...extras } = umzeptionExtras;

  if (!isStringArray(glob)) {
    throw new TypeError('Expected umzeption definition glob property to be a string array');
  }

  if (typeof installSchema !== 'function') {
    throw new TypeError('Expected umzeption definition glob property to be a string array');
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

/**
 * @param {unknown} value
 * @param {import('plugin-importer').ProcessPluginContext} context
 * @returns {UmzeptionDefinition<unknown>}
 */
export function processDefinition (value, { normalizedPluginName, pluginDir }) {
  if (!value || typeof value !== 'object') {
    throw new TypeError('Invalid umzeption definition, expected an object');
  }

  const supplementedValue = {
    name: normalizedPluginName.startsWith('.')
      ? getExtensionlessBasename(normalizedPluginName)
      : normalizedPluginName,
    pluginDir,
    ...value,
  };

  return ensureUmzeptionDefinition(supplementedValue);
}

/**
 * @template T
 * @param {string[]} dependencies
 * @param {import('plugin-importer').LoadPluginsOptions} [options]
 * @returns {Promise<UmzeptionDefinition<T>[]>}
 */
export async function loadDependencies (dependencies, options) {
  const pluginLoader = loadPlugins(processDefinition, options);

  return resolvePluginsInOrder(dependencies, pluginLoader);
}
