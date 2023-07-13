import { loadPlugins } from './load-plugins.js';
import { resolvePluginsInOrder } from './resolve-plugins.js';

/**
 * @typedef UmzeptionDefinition
 * @property {string[]} [dependencies]
 */

/**
 * @param {unknown} value
 * @returns {value is UmzeptionDefinition}
 */
function validateUmzeptionDefinition (value) {
  if (value && typeof value === 'object' && 'foo' in value) return true;
  return false;
}

/**
 * @param {unknown} value
 * @returns {UmzeptionDefinition}
 */
function processPlugin (value) {
  if (!validateUmzeptionDefinition(value)) {
    throw new Error('Invalid umzeption definition');
  }

  return value;
}

/**
 * @param {string[]} dependencies
 * @param {import('./load-plugins.js').LoadPluginsOptions} options
 * @returns {Promise<UmzeptionDefinition[]>}
 */
export async function loadDependencies (dependencies, options) {
  const pluginLoader = loadPlugins(processPlugin, options);

  return resolvePluginsInOrder(dependencies, pluginLoader);
}
