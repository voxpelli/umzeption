import { loadPlugins } from './load-plugins.js';
import { resolvePluginsInOrder } from './resolve-plugins.js';

/** @typedef {{ foo: boolean } & import('./resolve-plugins.js').PluginDefinition} UmzeptionPlugin */

/**
 * @param {object} value
 * @returns {value is UmzeptionPlugin}
 */
function validateUmzeptionPlugin (value) {
  if ('foo' in value) return true;
  return false;
}

/**
 * @param {import('./resolve-plugins.js').PluginDefinition} value
 * @returns {UmzeptionPlugin}
 */
function processPlugin (value) {
  if (!validateUmzeptionPlugin(value)) throw new Error('Yikes');
  return value;
}

/**
 * @param {string[]} dependencies
 * @param {import('./load-plugins.js').LoadPluginsOptions} options
 * @returns {Promise<UmzeptionPlugin[]>}
 */
export async function loadDependencies (dependencies, options) {
  const pluginLoader = loadPlugins(processPlugin, options);

  return resolvePluginsInOrder(dependencies, pluginLoader);
}
