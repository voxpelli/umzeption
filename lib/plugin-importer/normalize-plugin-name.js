import path from 'node:path';

/**
 * @param {string} pluginName
 * @param {string|undefined} [prefix]
 * @returns {string}
 */
export function normalizePluginName (pluginName, prefix) {
  if (typeof pluginName !== 'string') {
    throw new TypeError('Invalid pluginName, expected a string');
  }

  if (pluginName === '') {
    throw new Error('Invalid pluginName, expected the string to be non-empty');
  }

  if (pluginName.trim() !== pluginName) {
    throw new Error('Invalid pluginName, expected the string to not begin or end with whitespace');
  }

  const normalizedPath = path.normalize(pluginName);

  if (normalizedPath.startsWith('..')) {
    throw new Error(`Plugin name attempts directory traversal: "${pluginName}"`);
  }

  if (pluginName.startsWith('.')) {
    return '.' + path.sep + normalizedPath;
  }

  if (prefix) {
    // example-prefix-foo
    if (pluginName.startsWith(prefix)) {
      return normalizedPath;
    }
    // @voxpelli/example-prefix
    if (pluginName.startsWith('@') && !pluginName.includes('/')) {
      return pluginName + '/' + prefix;
    }
    // "example-prefix" + "-" + "foo" = example-prefix-foo
    return prefix + '-' + pluginName;
  }

  return pluginName;
}
