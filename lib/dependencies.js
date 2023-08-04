import {
  getExtensionlessBasename,
  loadPlugins,
  resolvePluginsInOrder,
} from 'plugin-importer';

import { ensureUmzeptionDefinition } from './definition.js';

/**
 * @param {unknown} value
 * @param {import('plugin-importer').ProcessPluginContext} context
 * @returns {import('./advanced-types.d.ts').UmzeptionDefinition}
 */
export function processDependency (value, { normalizedPluginName, pluginDir }) {
  if (!value || typeof value !== 'object') {
    throw new TypeError('Invalid umzeption definition, expected an object');
  }

  /** @type {object} */
  let resolvedValue;

  if ('umzeptionConfig' in value) {
    if (!value.umzeptionConfig || typeof value.umzeptionConfig !== 'object') {
      throw new TypeError('Invalid umzeption definition, expected "umzeptionConfig" to be an object or a function returning an object');
    }
    resolvedValue = value.umzeptionConfig;
  } else {
    resolvedValue = value;
  }

  const definition = {
    name: normalizedPluginName.startsWith('.')
      ? getExtensionlessBasename(normalizedPluginName)
      : normalizedPluginName,
    pluginDir,
    ...resolvedValue,
  };

  return ensureUmzeptionDefinition(definition);
}

/**
 * @template T
 * @param {string[]} dependencies
 * @param {import('plugin-importer').LoadPluginsOptions} [options]
 * @returns {Promise<import('./advanced-types.d.ts').UmzeptionDefinition<T>[]>}
 */
export async function loadDependencies (dependencies, options) {
  const pluginLoader = loadPlugins(processDependency, options);

  return resolvePluginsInOrder(dependencies, pluginLoader);
}
