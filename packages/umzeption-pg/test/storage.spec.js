import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import sinon from 'sinon';

import pg from 'pg';

import { BaseUmzeptionStorage, createUmzeptionContext } from 'umzeption';
import { UmzeptionPgStorage, createUmzeptionPgContext } from '../index.js';

describe('BaseUmzeptionStorage', () => {
  it('should throw Unsupported context type from base query()', async () => {
    const storage = new BaseUmzeptionStorage();
    const context = createUmzeptionContext('unknown', {});

    await assert.rejects(
      () => storage.query(context, 'SELECT 1'),
      /Unsupported context type: unknown/
    );
  });
});

function makeContext () {
  /** @type {{ sql: string, params: string[] }[]} */
  const queries = [];
  const queryStub = sinon.stub().callsFake(async (/** @type {string} */ sql, /** @type {string[]} */ params) => {
    queries.push({ sql, params });
    if (sql.includes('SELECT name')) return { rows: [{ name: 'test-migration' }] };
    return { rows: [] };
  });

  sinon.stub(pg.Pool.prototype, 'query').callsFake(queryStub);

  const pool = new pg.Pool({ connectionString: 'postgresql://localhost/test' });
  const context = createUmzeptionPgContext(pool);
  return { context, queries, queryStub };
}

describe('UmzeptionPgStorage', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('should call ensureTable only once across multiple calls', async () => {
    const { context, queryStub } = makeContext();
    const storage = new UmzeptionPgStorage();

    await storage.executed({ context });
    await storage.executed({ context });

    const ensureCalls = queryStub.args.filter(([sql]) =>
      typeof sql === 'string' && sql.includes('CREATE TABLE IF NOT EXISTS')
    );
    assert.equal(ensureCalls.length, 1, 'ensureTable should only run once');
  });

  it('should call logMigration with INSERT statement', async () => {
    const { context, queryStub } = makeContext();
    const storage = new UmzeptionPgStorage();

    await storage.logMigration({ context, name: 'test-migration', path: '/test.js' });

    const insertCalls = queryStub.args.filter(([sql]) =>
      typeof sql === 'string' && sql.includes('INSERT INTO umzeption_migrations')
    );
    assert.equal(insertCalls.length, 1, 'should call INSERT');
    assert.ok(insertCalls[0], 'insertCalls[0] should exist');
    assert.deepEqual(insertCalls[0][1], ['test-migration']);
  });

  it('should call unlogMigration with DELETE statement', async () => {
    const { context, queryStub } = makeContext();
    const storage = new UmzeptionPgStorage();

    await storage.unlogMigration({ context, name: 'test-migration', path: '/test.js' });

    const deleteCalls = queryStub.args.filter(([sql]) =>
      typeof sql === 'string' && sql.includes('DELETE FROM umzeption_migrations')
    );
    assert.equal(deleteCalls.length, 1, 'should call DELETE');
    assert.ok(deleteCalls[0], 'deleteCalls[0] should exist');
    assert.deepEqual(deleteCalls[0][1], ['test-migration']);
  });

  it('should return list of executed migrations from executed()', async () => {
    const { context } = makeContext();
    const storage = new UmzeptionPgStorage();

    const result = await storage.executed({ context });

    assert.ok(Array.isArray(result), 'should return an array');
    assert.ok(result.includes('test-migration'), 'should include the migration name from rows');
  });

  it('should use custom table name when provided', async () => {
    const { context, queryStub } = makeContext();
    const storage = new UmzeptionPgStorage({ tableName: 'custom_migrations' });

    await storage.logMigration({ context, name: 'test-migration', path: '/test.js' });

    const insertCalls = queryStub.args.filter(([sql]) =>
      typeof sql === 'string' && sql.includes('INSERT INTO custom_migrations')
    );
    assert.equal(insertCalls.length, 1, 'should use custom table name in INSERT');

    const createCalls = queryStub.args.filter(([sql]) =>
      typeof sql === 'string' && sql.includes('CREATE TABLE IF NOT EXISTS custom_migrations')
    );
    assert.equal(createCalls.length, 1, 'should use custom table name in CREATE TABLE');
  });

  it('should reject invalid table names', () => {
    assert.throws(
      () => new UmzeptionPgStorage({ tableName: 'DROP TABLE; --' }),
      /Invalid table name/
    );
    assert.throws(
      () => new UmzeptionPgStorage({ tableName: '123invalid' }),
      /Invalid table name/
    );
    assert.throws(
      () => new UmzeptionPgStorage({ tableName: '' }),
      /Invalid table name/
    );
  });

  it('should throw Unsupported context type for non-pg context', async () => {
    const storage = new UmzeptionPgStorage();
    const context = createUmzeptionContext('unknown', {});

    await assert.rejects(
      () => storage.query(/** @type {any} */ (context), 'SELECT 1'),
      /Unsupported context type: unknown/
    );
  });
});
