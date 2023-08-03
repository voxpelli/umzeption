import {
  getExtensionlessBasename,
  loadPlugins,
  resolvePluginsInOrder,
} from 'plugin-importer';

import { ensureUmzeptionDefinition } from './definition.js';

/**
 * @param {unknown} value
 * @param {import('plugin-importer').ProcessPluginContext} context
 * @returns {import('./definition.js').UmzeptionDefinition<unknown>}
 */
export function processDependency (value, { normalizedPluginName, pluginDir }) {
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
 * @returns {Promise<import('./definition.js').UmzeptionDefinition<T>[]>}
 */
export async function loadDependencies (dependencies, options) {
  const pluginLoader = loadPlugins(processDependency, options);

  return resolvePluginsInOrder(dependencies, pluginLoader);
}
