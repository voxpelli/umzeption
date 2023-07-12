import { ModuleImporter } from '@humanwhocodes/module-importer';

import { normalizePluginName as originalNormalizePluginName } from './normalize-plugin-name.js';
import { isPluginDefinition } from './resolve-plugins.js';

/**
 * @typedef ExtraOptions
 * @property {typeof import('./normalize-plugin-name.js').normalizePluginName} [customNormalizePluginName]
 * @property {string|undefined} [cwd]
 */

/** @typedef {import('./normalize-plugin-name.js').PluginNameOptions & ExtraOptions} LoadPluginsOptions */

/**
 * @template {import('./resolve-plugins.js').PluginDefinition} A
 * @param {(value: import('./resolve-plugins.js').PluginDefinition) => A} postProcess
 * @param {LoadPluginsOptions} [options]
 * @returns {(pluginName: string) => Promise<A>}
 */
export function loadPlugins (postProcess, options = {}) {
  const {
    customNormalizePluginName,
    cwd,
    ...pluginNameOptions
  } = options;

  const importer = new ModuleImporter(cwd);
  const normalizePluginName = customNormalizePluginName || originalNormalizePluginName;

  /**
   * @param {string} pluginName
   * @returns {Promise<A>}
   */
  return async (pluginName) => {
    const normalizedPluginName = normalizePluginName(pluginName, pluginNameOptions);
    const plugin = await importer.import(normalizedPluginName);

    if (!isPluginDefinition(plugin)) {
      throw new Error('Invalid plugin definition');
    }

    return postProcess(plugin);
  };
}
