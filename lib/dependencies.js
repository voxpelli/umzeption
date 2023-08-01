import {
  getExtensionlessBasename,
  isPluginDefinition,
  loadPlugins,
  resolvePluginsInOrder,
} from 'plugin-importer';

/**
 * @template T
 * @typedef UmzeptionDefinition
 * @property {string} name
 * @property {string} pluginDir
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

  if (!validateUmzeptionDefinition(supplementedValue)) {
    throw new Error('Invalid umzeption definition');
  }

  return supplementedValue;
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
