import { UmzeptionUnsupportedContextError } from './errors.js';

/** @type {Map<string, (context: import('./advanced-types.js').AnyUmzeptionContext, sql: string) => Promise<void>>} */
const schemaInstallers = new Map();

/**
 * Register a schema installer for a specific context type.
 * Called by adapter packages (e.g. umzeption-pg) to plug in their handler.
 *
 * @param {string} contextType
 * @param {(context: import('./advanced-types.js').AnyUmzeptionContext, sql: string) => Promise<void>} installer
 */
export function registerSchemaInstaller (contextType, installer) {
  schemaInstallers.set(contextType, installer);
}

/**
 * @param {import('./advanced-types.js').AnyUmzeptionContext} context
 * @param {string} createTablesString
 * @returns {Promise<void>}
 */
export async function installSchemaFromString (context, createTablesString) {
  const installer = schemaInstallers.get(context.type);
  if (installer) {
    await installer(context, createTablesString);
    return;
  }
  throw new UmzeptionUnsupportedContextError(context.type);
}
