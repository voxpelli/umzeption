import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import sinon from 'sinon';

import pg from 'pg';

import { createUmzeptionPgContext, withAdvisoryLock } from '../index.js';

describe('withAdvisoryLock', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('should acquire and release advisory lock around fn', async () => {
    /** @type {string[]} */
    const queries = [];
    sinon.stub(pg.Pool.prototype, 'query').callsFake(async (/** @type {string} */ sql) => {
      queries.push(sql);
      return { rows: [] };
    });

    const pool = new pg.Pool({ connectionString: 'postgresql://localhost/test' });
    const context = createUmzeptionPgContext(pool);

    const result = await withAdvisoryLock(context, 12345, async () => 'done');

    assert.equal(result, 'done');
    assert.equal(queries.length, 2);
    assert.ok(queries[0]?.includes('pg_advisory_lock'), 'should acquire lock');
    assert.ok(queries[1]?.includes('pg_advisory_unlock'), 'should release lock');
  });

  it('should release lock even when fn throws', async () => {
    /** @type {string[]} */
    const queries = [];
    sinon.stub(pg.Pool.prototype, 'query').callsFake(async (/** @type {string} */ sql) => {
      queries.push(sql);
      return { rows: [] };
    });

    const pool = new pg.Pool({ connectionString: 'postgresql://localhost/test' });
    const context = createUmzeptionPgContext(pool);

    await assert.rejects(
      () => withAdvisoryLock(context, 12345, async () => {
        throw new Error('fn failed');
      }),
      /fn failed/
    );

    assert.equal(queries.length, 2);
    assert.ok(queries[1]?.includes('pg_advisory_unlock'), 'should release lock on error');
  });

  it('should pass lockId as string parameter', async () => {
    /** @type {unknown[][]} */
    const params = [];
    sinon.stub(pg.Pool.prototype, 'query').callsFake(async (/** @type {string} */ _sql, /** @type {unknown[]} */ p) => {
      if (p) params.push(p);
      return { rows: [] };
    });

    const pool = new pg.Pool({ connectionString: 'postgresql://localhost/test' });
    const context = createUmzeptionPgContext(pool);

    await withAdvisoryLock(context, 99, async () => {});

    assert.equal(params.length, 2);
    assert.deepEqual(params[0], ['99']);
    assert.deepEqual(params[1], ['99']);
  });

  it('should reject non-integer lockId', async () => {
    sinon.stub(pg.Pool.prototype, 'query').resolves({ rows: [] });

    const pool = new pg.Pool({ connectionString: 'postgresql://localhost/test' });
    const context = createUmzeptionPgContext(pool);

    await assert.rejects(
      () => withAdvisoryLock(context, 1.5, async () => {}),
      /Invalid lockId.*Must be a safe integer/
    );
  });

  it('should reject NaN lockId', async () => {
    sinon.stub(pg.Pool.prototype, 'query').resolves({ rows: [] });

    const pool = new pg.Pool({ connectionString: 'postgresql://localhost/test' });
    const context = createUmzeptionPgContext(pool);

    await assert.rejects(
      () => withAdvisoryLock(context, Number.NaN, async () => {}),
      /Invalid lockId.*Must be a safe integer/
    );
  });

  it('should reject Infinity lockId', async () => {
    sinon.stub(pg.Pool.prototype, 'query').resolves({ rows: [] });

    const pool = new pg.Pool({ connectionString: 'postgresql://localhost/test' });
    const context = createUmzeptionPgContext(pool);

    await assert.rejects(
      () => withAdvisoryLock(context, Number.POSITIVE_INFINITY, async () => {}),
      /Invalid lockId.*Must be a safe integer/
    );
  });

  it('should reject unsafe integer lockId', async () => {
    sinon.stub(pg.Pool.prototype, 'query').resolves({ rows: [] });

    const pool = new pg.Pool({ connectionString: 'postgresql://localhost/test' });
    const context = createUmzeptionPgContext(pool);

    await assert.rejects(
      () => withAdvisoryLock(context, Number.MAX_SAFE_INTEGER + 1, async () => {}),
      /Invalid lockId.*Must be a safe integer/
    );
  });

  it('should return the value from fn', async () => {
    sinon.stub(pg.Pool.prototype, 'query').resolves({ rows: [] });

    const pool = new pg.Pool({ connectionString: 'postgresql://localhost/test' });
    const context = createUmzeptionPgContext(pool);

    const result = await withAdvisoryLock(context, 1, async () => ({ migrated: 5 }));

    assert.deepEqual(result, { migrated: 5 });
  });
});
