import { UmzeptionUnsupportedContextError } from './errors.js';

/** @typedef {import('./advanced-types.js').AnyUmzeptionContext} AnyUmzeptionContext */

/**
 * @template {AnyUmzeptionContext} T
 * @typedef {import('./advanced-types.js').UmzeptionStorage<T>} UmzeptionStorage
 */

/**
 * @template {AnyUmzeptionContext} T
 * @augments {UmzeptionStorage<T>}
 */
export class BaseUmzeptionStorage {
  #tableEnsured = false;
  #tableName;

  /** @param {{ tableName?: string }} [options] */
  constructor (options) {
    const tableName = options?.tableName ?? 'umzeption_migrations';
    if (!/^[a-z_]\w*$/i.test(tableName)) {
      throw new TypeError(`Invalid table name "${tableName}": must match /^[a-z_]\\w*$/i`);
    }
    this.#tableName = tableName;
  }

  /** @type {UmzeptionStorage<T>["logMigration"]} */
  async logMigration ({ context, name }) {
    await this.ensureTable(context);
    await this.query(context, `INSERT INTO ${this.#tableName} (name) VALUES ($1)`, name);
  }

  /** @type {UmzeptionStorage<T>["unlogMigration"]} */
  async unlogMigration ({ context, name }) {
    await this.ensureTable(context);
    await this.query(context, `DELETE FROM ${this.#tableName} WHERE name = $1`, name);
  }

  /** @type {UmzeptionStorage<T>["executed"]} */
  async executed ({ context }) {
    await this.ensureTable(context);
    const { rows } = await this.query(context, `SELECT name FROM ${this.#tableName}`);
    return rows.map(row => typeof row['name'] === 'string' ? row['name'] : '');
  }

  /** @type {UmzeptionStorage<T>["query"]} */
  async query (context, _query, ..._values) {
    throw new UmzeptionUnsupportedContextError(context.type);
  }

  /** @type {UmzeptionStorage<T>["ensureTable"]} */
  async ensureTable (context) {
    if (this.#tableEnsured) return;

    await this.query(context, `
      CREATE TABLE IF NOT EXISTS ${this.#tableName} (
        name VARCHAR(255) PRIMARY KEY,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.query(context, `
      CREATE INDEX IF NOT EXISTS idx_${this.#tableName}_created_at
      ON ${this.#tableName} (created_at)
    `);

    this.#tableEnsured = true;
  }
}
