import { loadPlugins } from './load-plugins.js';
import { isPluginDefinition, resolvePluginsInOrder } from './resolve-plugins.js';
import { getExtensionlessBasename } from './utils.js';

/**
 * @typedef UmzeptionDefinition
 * @property {string} name
 * @property {string[]} [dependencies]
 */

/**
 * @param {unknown} value
 * @returns {value is UmzeptionDefinition}
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
 * @param {{ normalizedPluginName: string }} context
 * @returns {UmzeptionDefinition}
 */
export function processDefinition (value, { normalizedPluginName }) {
  if (!value || typeof value !== 'object') {
    throw new TypeError('Invalid umzeption definition, expected an object');
  }

  const supplementedValue = {
    name: normalizedPluginName.startsWith('.')
      ? getExtensionlessBasename(normalizedPluginName)
      : normalizedPluginName,
    ...value,
  };

  if (!validateUmzeptionDefinition(supplementedValue)) {
    throw new Error('Invalid umzeption definition');
  }

  return supplementedValue;
}

/**
 * @param {string[]} dependencies
 * @param {import('./load-plugins.js').LoadPluginsOptions} [options]
 * @returns {Promise<UmzeptionDefinition[]>}
 */
export async function loadDependencies (dependencies, options) {
  const pluginLoader = loadPlugins(processDefinition, options);

  return resolvePluginsInOrder(dependencies, pluginLoader);
}
