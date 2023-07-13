import path from 'node:path';

/**
 * @param {string} value
 * @returns {string}
 */
export function getExtensionlessBasename (value) {
  if (typeof value !== 'string') {
    throw new TypeError('Invalid value, expected a string');
  }

  const basename = path.basename(value);
  const extensionSeparatorPosition = basename.indexOf('.');

  return extensionSeparatorPosition > 0
    ? basename.slice(0, extensionSeparatorPosition)
    : basename;
}
