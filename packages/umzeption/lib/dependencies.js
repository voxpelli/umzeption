import {
  getExtensionlessBasename,
  loadPlugins,
  resolvePluginsInOrder,
} from 'plugin-importer';

import { ensureUmzeptionDefinition } from './definition.js';

/** @import { AnyUmzeptionContext, UmzeptionDefinition } from './advanced-types.d.ts' */
/** @import { LoadPluginsOptions, ProcessPluginContext } from 'plugin-importer' */

/**
 * @param {unknown} value
 * @param {ProcessPluginContext} context
 * @returns {UmzeptionDefinition}
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
 * @template {AnyUmzeptionContext} T
 * @param {string[]} dependencies
 * @param {LoadPluginsOptions} [options]
 * @returns {Promise<UmzeptionDefinition<T>[]>}
 */
export async function loadDependencies (dependencies, options) {
  const pluginLoader = loadPlugins(processDependency, options);

  return resolvePluginsInOrder(dependencies, pluginLoader);
}
