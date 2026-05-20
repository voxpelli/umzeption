/** @import { DefineUmzeptionContexts, UmzeptionContext, UmzeptionContextTypes } from './advanced-types.d.ts' */

/**
 * @template {UmzeptionContextTypes} T
 * @template {DefineUmzeptionContexts[T]["value"]} V
 * @param {T} type
 * @param {V} value
 * @returns {UmzeptionContext<T, V>}
 */
export function createUmzeptionContext (type, value) {
  return /** @type {UmzeptionContext<T, V>} */ ({ type, value });
}
