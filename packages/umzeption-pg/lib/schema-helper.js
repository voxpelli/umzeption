import { registerSchemaInstaller } from 'umzeption';

/** @typedef {import('./pg-types.d.ts').UmzeptionPgContext} UmzeptionPgContext */

/**
 * Single-pass SQL parser: strips comments and splits on semicolons,
 * respecting string literals. Uses a state machine to avoid
 * polynomial regex backtracking.
 *
 * @param {string} sql
 * @returns {string[]}
 */
function splitStatements (sql) {
  /** @type {string[]} */
  const parts = [];
  let current = '';
  let i = 0;

  while (i < sql.length) {
    // Block comment: /* ... */
    if (sql[i] === '/' && sql[i + 1] === '*') {
      i += 2;
      while (i < sql.length && !(sql[i] === '*' && sql[i + 1] === '/')) {
        i++;
      }
      if (i < sql.length) i += 2;
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
      current += sql[i++];
      while (i < sql.length) {
        if (sql[i] === "'" && sql[i + 1] === "'") {
          current += "''";
          i += 2;
        } else if (sql[i] === "'") {
          current += "'";
          i++;
          break;
        } else {
          current += sql[i++];
        }
      }
      continue;
    }
    // Semicolon: statement boundary
    if (sql[i] === ';') {
      const trimmed = current.trim();
      if (trimmed) parts.push(trimmed);
      current = '';
      i++;
      continue;
    }
    current += sql[i++];
  }

  const trimmed = current.trim();
  if (trimmed) parts.push(trimmed);

  return parts;
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

registerSchemaInstaller('pg', /** @type {any} */ (pgInstallSchemaFromString));
