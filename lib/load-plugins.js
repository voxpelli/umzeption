import { ModuleImporter } from '@humanwhocodes/module-importer';

import { normalizePluginName as originalNormalizePluginName } from './normalize-plugin-name.js';
import { isPluginDefinition } from './resolve-plugins.js';

/**
 * @typedef ExtraOptions
 * @property {typeof import('./normalize-plugin-name.js').normalizePluginName} [customNormalizePluginName]
 * @property {string|undefined} [cwd]
 * @property {string|undefined} [prefix]
 */

/** @typedef {import('./normalize-plugin-name.js').PluginNameOptions & ExtraOptions} LoadPluginsOptions */

/**
 * @template {import('./resolve-plugins.js').PluginDefinition} A
 * @param {(value: unknown, context: { normalizedPluginName: string }) => A} processPlugin
 * @param {LoadPluginsOptions} [options]
 * @returns {(pluginName: string) => Promise<A>}
 */
export function loadPlugins (processPlugin, options = {}) {
  const {
    customNormalizePluginName,
    cwd,
    prefix,
  } = options;

  const importer = new ModuleImporter(cwd);
  const normalizePluginName = customNormalizePluginName || originalNormalizePluginName;

  /**
   * @param {string} pluginName
   * @returns {Promise<A>}
   */
  return async (pluginName) => {
    const normalizedPluginName = normalizePluginName(pluginName, prefix);
    const loadedPlugin = await importer.import(normalizedPluginName);

    const plugin = processPlugin(loadedPlugin, { normalizedPluginName });

    if (!isPluginDefinition(plugin)) {
      throw new Error('Invalid plugin definition');
    }

    return plugin;
  };
}
