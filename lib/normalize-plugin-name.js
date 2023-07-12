import path from 'node:path';

/**
 * @typedef PluginNameOptions
 * @property {string} [prefix]
 */

/**
 * @param {string} pluginName
 * @param {PluginNameOptions} [options]
 * @returns {string}
 */
export function normalizePluginName (pluginName, options = {}) {
  const {
    prefix,
  } = options;

  if (typeof pluginName !== 'string') throw new TypeError('Invalid pluginName, expected a non-empty string');

  const normalizedPath = path.normalize(pluginName);

  if (normalizedPath.startsWith('..')) {
    throw new Error(`Plugin name attempts directory traversal: "${pluginName}"`);
  }

  if (pluginName.startsWith('.')) {
    return './' + normalizedPath;
  }

  if (!prefix || normalizedPath.startsWith(prefix)) {
    return pluginName;
  }

  return prefix + pluginName;
}
