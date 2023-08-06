/**
 * @template {import("./advanced-types.js").UmzeptionContextTypes} T
 * @template {import("./advanced-types.js").DefineUmzeptionContexts[T]["value"]} V
 * @param {T} type
 * @param {V} value
 * @returns {import("./advanced-types.js").UmzeptionContext<T, V>}
 */
export function createUmzeptionContext (type, value) {
  return /** @type {import("./advanced-types.js").UmzeptionContext<T, V>} */ ({ type, value });
}
