import { ModuleImporter } from '@humanwhocodes/module-importer';

import { normalizePluginName as originalNormalizePluginName } from './normalize-plugin-name.js';
import { isPluginDefinition } from './resolve-plugins.js';

/**
 * @typedef LoadPluginsOptions
 * @property {typeof import('./normalize-plugin-name.js').normalizePluginName} [customNormalizePluginName]
 * @property {string|undefined} [cwd]
 * @property {string|undefined} [prefix]
 */

/**
 * @typedef ProcessPluginContext
 * @property {string} filePath
 * @property {string} normalizedPluginName
 */

/**
 * @template {import('./resolve-plugins.js').PluginDefinition} A
 * @param {(value: unknown, context: ProcessPluginContext) => A} processPlugin
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
    const pluginPath = importer.resolve(normalizedPluginName);

    if (!pluginPath) {
      throw new Error('Unable to resolve path for plugin: ' + normalizedPluginName);
    }

    const loadedPlugin = await importer.import(pluginPath);

    const plugin = processPlugin(loadedPlugin, {
      filePath: pluginPath,
      normalizedPluginName,
    });

    if (!isPluginDefinition(plugin)) {
      throw new Error('Invalid plugin definition');
    }

    return plugin;
  };
}
