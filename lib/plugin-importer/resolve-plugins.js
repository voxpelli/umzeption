import topo from '@hapi/topo';

import { isUnknownArray } from './utils.js';

const Topo = topo.Sorter;

/**
 * @typedef PluginDefinition
 * @property {string} [name]
 * @property {string} [filePath]
 * @property {string[]} [dependencies]
 */

/**
 * @param {unknown} value
 * @returns {value is PluginDefinition}
 */
export function isPluginDefinition (value) {
  // Ensure we have an object, else its not a plugin definition
  if (!value || typeof value !== 'object') {
    return false;
  }

  if (
    'dependencies' in value && (
      !isUnknownArray(value.dependencies) ||
      !value.dependencies.every(value => typeof value === 'string')
    )
  ) {
    return false;
  }

  if ('name' in value && typeof value.name !== 'string') {
    return false;
  }

  if ('filePath' in value && typeof value.filePath !== 'string') {
    return false;
  }

  return true;
}

/**
 * @template {PluginDefinition} T
 * @callback LoadPlugin
 * @param {string} pluginName
 * @returns {T|Promise<T>}
 */

/**
 * @template T
 * @typedef ResolvePluginOrderContext
 * @property {Set<string>} loadedPlugins
 * @property {Set<string>} missingPlugins
 * @property {import('@hapi/topo').Sorter<T|false>} orderedPlugins
 * @property {boolean} allowOptionalDependencies
 */

/**
 * @template {PluginDefinition} T
 * @param {string[]} plugins
 * @param {LoadPlugin<T>} loadPlugin
 * @param {ResolvePluginOrderContext<T>} context
 * @returns {Promise<void>}
 */
async function internalResolvePluginOrder (plugins, loadPlugin, context) {
  const {
    allowOptionalDependencies,
    loadedPlugins,
    missingPlugins,
    orderedPlugins,
  } = context;

  for (let pluginName of plugins) {
    const optionalDependency = allowOptionalDependencies && pluginName.endsWith('?');

    if (optionalDependency) {
      pluginName = pluginName.slice(0, -1);
    }

    if (loadedPlugins.has(pluginName)) {
      continue;
    }

    loadedPlugins.add(pluginName);

    /** @type {T} */
    let pluginDefinition;

    try {
      pluginDefinition = await loadPlugin(pluginName);
    } catch (cause) {
      throw new Error(`Failed to load plugin "${pluginName}"`, { cause });
    }

    if (!pluginDefinition) {
      if (optionalDependency && allowOptionalDependencies) {
        orderedPlugins.add(false, { group: pluginName });
      } else {
        missingPlugins.add(pluginName);
      }

      continue;
    }

    const dependencies = pluginDefinition.dependencies || [];

    try {
      orderedPlugins.add(pluginDefinition, {
        after: dependencies,
        group: pluginName,
      });
    } catch (cause) {
      throw new Error(`Failed to add plugin "${pluginName}"`, { cause });
    }

    await internalResolvePluginOrder(dependencies, loadPlugin, {
      allowOptionalDependencies,
      loadedPlugins,
      missingPlugins,
      orderedPlugins,
    });
  }
}

/**
 * @template {PluginDefinition} T
 * @overload
 * @param {string[]} plugins
 * @param {LoadPlugin<T>} loadPlugin
 * @returns {Promise<T[]>}
 */

/**
 * @template {PluginDefinition} T
 * @overload
 * @param {string[]} plugins
 * @param {LoadPlugin<T>} loadPlugin
 * @param {true} allowOptionalDependencies
 * @returns {Promise<Array<T|false>>}
 */

/**
 * @template {PluginDefinition} T
 * @param {string[]} plugins
 * @param {LoadPlugin<T>} loadPlugin
 * @param {true} [allowOptionalDependencies]
 * @returns {Promise<T[] | Array<T|false>>}
 */
export async function resolvePluginsInOrder (plugins, loadPlugin, allowOptionalDependencies) {
  if (!Array.isArray(plugins)) throw new TypeError('Expected plugins to be an array of strings');
  if (typeof loadPlugin !== 'function') throw new TypeError('Expected loadPlugin to be a function');

  /** @type {Set<string>} */
  const loadedPlugins = new Set();
  /** @type {Set<string>} */
  const missingPlugins = new Set();
  /** @type {import('@hapi/topo').Sorter<T|false>} */
  const orderedPlugins = new Topo();

  await internalResolvePluginOrder(plugins, loadPlugin, {
    allowOptionalDependencies: allowOptionalDependencies || false,
    loadedPlugins,
    missingPlugins,
    orderedPlugins,
  });

  if (missingPlugins.size > 0) {
    const values = [...missingPlugins];
    throw new Error(`Plugin${values.length > 1 ? 's' : ''} missing: "${values.join('", "')}"`);
  }

  return orderedPlugins.nodes;
}
