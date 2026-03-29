import { registerSchemaInstaller } from 'umzeption';

/** @typedef {import('./pg-types.d.ts').UmzeptionPgContext} UmzeptionPgContext */

/**
 * Strip block comments and single-line comments from SQL,
 * preserving semicolons inside string literals.
 *
 * @param {string} sql
 * @returns {string}
 */
function stripComments (sql) {
  // Match: block comments, single-line comments, or string literals (to skip them)
  return sql.replaceAll(/\/\*[\s\S]*?\*\/|--[^\n]*|'(?:[^'\\]|\\.)*'/g, (match) => {
    if (match.startsWith("'")) return match; // preserve string literals
    return ''; // remove comments
  });
}

/**
 * Split SQL on semicolons, but not those inside string literals.
 *
 * @param {string} sql
 * @returns {string[]}
 */
function splitOnSemicolons (sql) {
  /** @type {string[]} */
  const parts = [];
  let current = '';
  let inString = false;

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i] ?? '';
    if (inString) {
      current += ch;
      if (ch === "'" && sql[i + 1] === "'") {
        current += "'";
        i++; // skip escaped quote
      } else if (ch === "'") {
        inString = false;
      }
    } else if (ch === "'") {
      inString = true;
      current += ch;
    } else if (ch === ';') {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }

  if (current) parts.push(current);
  return parts;
}

/**
 * Split a SQL string into individual CREATE statements.
 * Handles block comments, single-line comments, and semicolons in string literals.
 *
 * @param {string} createTablesString
 * @returns {string[]}
 */
function getTablesFromString (createTablesString) {
  const cleaned = stripComments(createTablesString);

  // Split on semicolons outside of string literals
  const statements = splitOnSemicolons(cleaned);

  return statements
    .map(statement => {
      const trimmed = statement.trim();
      if (!trimmed) return '';
      // Ensure each statement starts with CREATE
      return trimmed.startsWith('CREATE ') ? trimmed : 'CREATE ' + trimmed;
    })
    .filter(Boolean);
}

/**
 * @param {UmzeptionPgContext} context
 * @param {string} createTablesString
 * @returns {Promise<void>}
 */
export async function pgInstallSchemaFromString (context, createTablesString) {
  const tables = getTablesFromString(createTablesString);

  await context.value.transact(async (/** @type {import('pg').PoolClient} */ client) => {
    for (const table of tables) {
      await client.query(table);
    }
  });
}

// Register this handler with the core umzeption installSchemaFromString dispatcher
registerSchemaInstaller('pg', /** @type {any} */ (pgInstallSchemaFromString));
