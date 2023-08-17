/**
 * @param {string} createTablesString
 * @returns {string[]}
 */
function getTablesFromString (createTablesString) {
  return createTablesString.split(/;\s+^CREATE /gm).map(table => {
    table = table.trim();
    table = table.endsWith(';') ? table.slice(0, -1) : table;
    table = table.startsWith('CREATE ') ? table : 'CREATE ' + table;
    return table;
  });
}

/**
 * @param {string|Promise<string>} createTablesString
 * @returns {import('umzug').MigrationFn<import('./advanced-types.js').AnyUmzeptionContext>}
 */
export function installSchemaFromString (createTablesString) {
  return async ({ context }) => {
    if (context.type !== 'pg') {
      throw new Error(`Unsupported context type: ${context.type}`);
    }

    const tables = getTablesFromString(await createTablesString);

    await context.value.transact(async client => {
      for (const table of tables) {
        await client.query(table);
      }
    });
  };
}
