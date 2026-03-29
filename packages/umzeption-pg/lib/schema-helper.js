import { registerSchemaInstaller } from 'umzeption';

/** @typedef {import('./pg-types.d.ts').UmzeptionPgContext} UmzeptionPgContext */

/**
 * Strip block comments and single-line comments from SQL,
 * preserving string literals. Uses a state machine to avoid
 * polynomial regex backtracking.
 *
 * @param {string} sql
 * @returns {string}
 */
function stripComments (sql) {
  let result = '';
  let i = 0;

  while (i < sql.length) {
    // Block comment: /* ... */
    if (sql[i] === '/' && sql[i + 1] === '*') {
      i += 2;
      while (i < sql.length && !(sql[i] === '*' && sql[i + 1] === '/')) {
        i++;
      }
      if (i < sql.length) i += 2; // skip */
      continue;
    }
    // Single-line comment: -- ...
    if (sql[i] === '-' && sql[i + 1] === '-') {
      i += 2;
      while (i < sql.length && sql[i] !== '\n') {
        i++;
      }
      continue;
    }
    // String literal: '...' (with '' escape)
    if (sql[i] === "'") {
      result += sql[i++];
      while (i < sql.length) {
        if (sql[i] === "'" && sql[i + 1] === "'") {
          result += "''";
          i += 2;
        } else if (sql[i] === "'") {
          result += "'";
          i++;
          break;
        } else {
          result += sql[i++];
        }
      }
      continue;
    }
    result += sql[i++];
  }

  return result;
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
    const ch = /** @type {string} */ (sql[i]);
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
 * Split a SQL string into individual statements.
 * Handles block comments, single-line comments, and semicolons in string literals.
 * Supports all statement types (CREATE, ALTER, INSERT, GRANT, etc.).
 *
 * @param {string} sqlString
 * @returns {string[]}
 */
function splitStatements (sqlString) {
  const cleaned = stripComments(sqlString);

  // Split on semicolons outside of string literals
  const statements = splitOnSemicolons(cleaned);

  return statements
    .map(statement => statement.trim())
    .filter(Boolean);
}

/**
 * @param {UmzeptionPgContext} context
 * @param {string} createTablesString
 * @returns {Promise<void>}
 */
export async function pgInstallSchemaFromString (context, createTablesString) {
  const statements = splitStatements(createTablesString);

  await context.value.transact(async (/** @type {import('pg').PoolClient} */ client) => {
    for (const statement of statements) {
      await client.query(statement);
    }
  });
}

// Register this handler with the core umzeption installSchemaFromString dispatcher
registerSchemaInstaller('pg', /** @type {any} */ (pgInstallSchemaFromString));
