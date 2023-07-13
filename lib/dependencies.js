import { loadPlugins } from './load-plugins.js';
import { isPluginDefinition, resolvePluginsInOrder } from './resolve-plugins.js';
import { getExtensionlessBasename } from './utils.js';

/**
 * @template T
 * @typedef UmzeptionDefinition
 * @property {string} name
 * @property {string} filePath
 * @property {string[]} glob
 * @property {string[]} [dependencies]
 */

/**
 * @param {unknown} value
 * @returns {value is UmzeptionDefinition<unknown>}
 */
function validateUmzeptionDefinition (value) {
  if (!isPluginDefinition(value)) return false;

  if (value.name === undefined) {
    return false;
  }

  return true;
}

/**
 * @param {unknown} value
 * @param {import('./load-plugins.js').ProcessPluginContext} context
 * @returns {UmzeptionDefinition<unknown>}
 */
export function processDefinition (value, { filePath, normalizedPluginName }) {
  if (!value || typeof value !== 'object') {
    throw new TypeError('Invalid umzeption definition, expected an object');
  }

  const supplementedValue = {
    name: normalizedPluginName.startsWith('.')
      ? getExtensionlessBasename(normalizedPluginName)
      : normalizedPluginName,
    filePath,
    ...value,
  };

  if (!validateUmzeptionDefinition(supplementedValue)) {
    throw new Error('Invalid umzeption definition');
  }

  return supplementedValue;
}

/**
 * @template T
 * @param {string[]} dependencies
 * @param {import('./load-plugins.js').LoadPluginsOptions} [options]
 * @returns {Promise<UmzeptionDefinition<T>[]>}
 */
export async function loadDependencies (dependencies, options) {
  const pluginLoader = loadPlugins(processDefinition, options);

  return resolvePluginsInOrder(dependencies, pluginLoader);
}
