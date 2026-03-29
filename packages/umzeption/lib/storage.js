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

  /** @type {UmzeptionStorage<T>["logMigration"]} */
  async logMigration ({ context, name }) {
    await this.ensureTable(context);
    await this.query(context, 'INSERT INTO umzeption_migrations (name) VALUES ($1)', name);
  }

  /** @type {UmzeptionStorage<T>["unlogMigration"]} */
  async unlogMigration ({ context, name }) {
    await this.ensureTable(context);
    await this.query(context, 'DELETE FROM umzeption_migrations WHERE name = $1', name);
  }

  /** @type {UmzeptionStorage<T>["executed"]} */
  async executed ({ context }) {
    await this.ensureTable(context);
    const { rows } = await this.query(context, 'SELECT name FROM umzeption_migrations');
    return rows.map(row => typeof row['name'] === 'string' ? row['name'] : '');
  }

  /** @type {UmzeptionStorage<T>["query"]} */
  async query (context, _query, ..._values) {
    throw new Error(`Unsupported context type: ${context.type}`);
  }

  /** @type {UmzeptionStorage<T>["ensureTable"]} */
  async ensureTable (context) {
    if (this.#tableEnsured) return;

    this.#tableEnsured = true;

    await this.query(context, `
      CREATE TABLE IF NOT EXISTS umzeption_migrations (
        name VARCHAR(255) PRIMARY KEY,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
}
