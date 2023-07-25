import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
    cwd = process.cwd(),
    prefix,
  } = options;

  const require = createRequire(cwd + path.sep);
  const normalizePluginName = customNormalizePluginName || originalNormalizePluginName;
  const dirname = path.dirname(fileURLToPath(import.meta.url)) + path.sep;

  /**
   * @param {string} pluginName
   * @returns {Promise<A>}
   */
  return async (pluginName) => {
    const normalizedPluginName = normalizePluginName(pluginName, prefix);
    const pluginPath = require.resolve(normalizedPluginName);
    const relativePosixPath = './' + path.relative(dirname, pluginPath).replaceAll('\\', '/');

    /** @type {unknown} */
    const loadedPlugin = await import(relativePosixPath)
      .catch(cause => {
        throw new Error(`Import of ${pluginName} from ${relativePosixPath} failed`, { cause });
      });

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
