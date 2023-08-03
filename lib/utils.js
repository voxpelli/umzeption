/**
 * @template {object} T
 * @template {keyof T} KeysPartialPick
 * @template {keyof T} [KeysOmit=never]
 * @typedef {Omit<T, KeysPartialPick | KeysOmit> & Partial<Pick<T, KeysPartialPick>>} PartialKeys
 */

/**
 * Array.isArray() on its own give type any[]
 *
 * @param {unknown} value
 * @returns {value is unknown[]}
 */
function isUnknownArray (value) {
  return Array.isArray(value);
}

/**
 * @param {unknown} value
 * @returns {value is string[]}
 */
export function isStringArray (value) {
  if (!isUnknownArray(value)) return false;
  return value.every(item => typeof item === 'string');
}
