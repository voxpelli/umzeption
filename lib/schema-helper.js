/**
 * Split a SQL string into individual CREATE statements.
 * Handles single-line comments (--) between statements.
 *
 * Known limitations: does not handle multi-line block comments (/* *\/),
 * semicolons inside string literals, or non-CREATE statement types.
 *
 * @param {string} createTablesString
 * @returns {string[]}
 */
function getTablesFromString (createTablesString) {
  // Split on semicolons followed by optional whitespace and optional single-line comments before CREATE
  const statements = createTablesString.split(/;[ \t]*(?:\r?\n[ \t]*(?:--[^\n]*)?\r?\n)*[ \t]*/);

  return statements
    .map(statement => {
      // Strip leading single-line comments and whitespace
      let trimmed = statement.replace(/^(?:--[^\n]*\n)+/, '').trim();
      if (!trimmed) return '';
      // Ensure each statement ends without a semicolon (we split on them)
      trimmed = trimmed.endsWith(';') ? trimmed.slice(0, -1) : trimmed;
      // Ensure each statement starts with CREATE
      trimmed = trimmed.startsWith('CREATE ') ? trimmed : 'CREATE ' + trimmed;
      return trimmed;
    })
    .filter(Boolean);
}

/**
 * @param {import('./advanced-types.js').DefineUmzeptionContexts['pg']} context
 * @param {string} createTablesString
 * @returns {Promise<void>}
 */
export async function pgInstallSchemaFromString (context, createTablesString) {
  const tables = getTablesFromString(createTablesString);

  await context.value.transact(async client => {
    for (const table of tables) {
      await client.query(table);
    }
  });
}

/**
 * @param {import('./advanced-types.js').AnyUmzeptionContext} context
 * @param {string} createTablesString
 * @returns {Promise<void>}
 */
export async function installSchemaFromString (context, createTablesString) {
  switch (context.type) {
    case 'pg':
      await pgInstallSchemaFromString(context, createTablesString);
      break;
    default:
      throw new Error(`Unsupported context type: ${context.type}`);
  }
}
