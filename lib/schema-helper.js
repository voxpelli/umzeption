/**
 * @param {string} createTablesString
 * @returns {string[]}
 */
function getTablesFromString (createTablesString) {
  return createTablesString.split(/;\s+(?:^--[^\n]+\n+)?^CREATE /m).map(table => {
    table = table.replace(/^--[^\n]+\n+/, '').trim();
    table = table.endsWith(';') ? table.slice(0, -1) : table;
    table = table.startsWith('CREATE ') ? table : 'CREATE ' + table;
    return table;
  });
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
