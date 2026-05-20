import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import pg from 'pg';
import sinon from 'sinon';

import { createUmzeptionPgContext } from '../index.js';

describe('pg-utils: createFastifyPostgresStyleDb (via createUmzeptionPgContext)', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('should create a context with pool, query, connect, and transact', () => {
    sinon.stub(pg.Pool.prototype, 'query').resolves({ rows: [] });
    sinon.stub(pg.Pool.prototype, 'connect').resolves({ query: sinon.stub(), release: sinon.stub() });

    const pool = new pg.Pool({ connectionString: 'postgresql://localhost/test' });
    const context = createUmzeptionPgContext(pool);

    assert.equal(context.type, 'pg');
    assert.ok(context.value, 'value should be defined');
    assert.ok(context.value.pool, 'pool should be defined');
    assert.ok(typeof context.value.query === 'function', 'query should be a function');
    assert.ok(typeof context.value.connect === 'function', 'connect should be a function');
    assert.ok(typeof context.value.transact === 'function', 'transact should be a function');
  });

  describe('transact', () => {
    it('should BEGIN and COMMIT on success', async () => {
      /** @type {string[]} */
      const queries = [];
      const clientQuery = sinon.stub().callsFake(async (/** @type {string} */ sql) => {
        queries.push(sql);
        return { rows: [] };
      });
      const clientRelease = sinon.stub();

      sinon.stub(pg.Pool.prototype, 'connect').resolves({
        query: clientQuery,
        release: clientRelease,
      });

      const pool = new pg.Pool({ connectionString: 'postgresql://localhost/test' });
      const context = createUmzeptionPgContext(pool);

      await context.value.transact(async (/** @type {import('pg').PoolClient} */ client) => {
        await client.query('SELECT 1');
      });

      assert.deepEqual(queries, ['BEGIN', 'SELECT 1', 'COMMIT']);
      assert.ok(clientRelease.calledOnce, 'release should be called once');
    });

    it('should ROLLBACK and throw on failure', async () => {
      /** @type {string[]} */
      const queries = [];
      const clientQuery = sinon.stub().callsFake(async (/** @type {string} */ sql) => {
        queries.push(sql);
        if (sql === 'FAIL') throw new Error('query failed');
        return { rows: [] };
      });
      const clientRelease = sinon.stub();

      sinon.stub(pg.Pool.prototype, 'connect').resolves({
        query: clientQuery,
        release: clientRelease,
      });

      const pool = new pg.Pool({ connectionString: 'postgresql://localhost/test' });
      const context = createUmzeptionPgContext(pool);

      await assert.rejects(
        () => context.value.transact(async (/** @type {import('pg').PoolClient} */ client) => {
          await client.query('FAIL');
        }),
        /Transaction rolled back/
      );

      assert.ok(queries.includes('ROLLBACK'), 'should call ROLLBACK');
      assert.ok(clientRelease.calledOnce, 'release should always be called');
    });

    it('should release client even when ROLLBACK itself throws', async () => {
      const clientRelease = sinon.stub();
      const clientQuery = sinon.stub().callsFake(async (sql) => {
        if (sql === 'BEGIN') return { rows: [] };
        throw new Error('unexpected query');
      });

      sinon.stub(pg.Pool.prototype, 'connect').resolves({
        query: clientQuery,
        release: clientRelease,
      });

      const pool = new pg.Pool({ connectionString: 'postgresql://localhost/test' });
      const context = createUmzeptionPgContext(pool);

      await assert.rejects(
        () => context.value.transact(async () => {
          throw new Error('callback error');
        })
      );

      assert.ok(clientRelease.calledOnce, 'release should be called even on ROLLBACK failure');
    });
  });
});
