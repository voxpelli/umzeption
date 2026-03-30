import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import sinon from 'sinon';

import pg from 'pg';

import { createUmzeptionPgContext, withAdvisoryLock } from '../index.js';

/**
 * Create a stubbed client that records queries.
 *
 * @param {{ queries?: string[], params?: unknown[][] }} [options]
 * @returns {{ queries: string[], params: unknown[][], clientQuery: sinon.SinonStub, clientRelease: sinon.SinonStub }}
 */
function makeClient (options) {
  /** @type {string[]} */
  const queries = options?.queries ?? [];
  /** @type {unknown[][]} */
  const params = options?.params ?? [];

  const clientQuery = sinon.stub().callsFake(async (/** @type {string} */ sql, /** @type {unknown[]} */ p) => {
    queries.push(sql);
    if (p) params.push(p);
    return { rows: [] };
  });
  const clientRelease = sinon.stub();

  sinon.stub(pg.Pool.prototype, 'connect').resolves({
    query: clientQuery,
    release: clientRelease,
  });

  return { queries, params, clientQuery, clientRelease };
}

describe('withAdvisoryLock', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('should acquire and release advisory lock on a single client', async () => {
    const { clientRelease, queries } = makeClient();

    const pool = new pg.Pool({ connectionString: 'postgresql://localhost/test' });
    const context = createUmzeptionPgContext(pool);

    const result = await withAdvisoryLock(context, 12345, async () => 'done');

    assert.equal(result, 'done');
    assert.equal(queries.length, 2);
    assert.ok(queries[0]?.includes('pg_advisory_lock'), 'should acquire lock');
    assert.ok(queries[1]?.includes('pg_advisory_unlock'), 'should release lock');
    assert.ok(clientRelease.calledOnce, 'should release client');
  });

  it('should release lock and client even when fn throws', async () => {
    const { clientRelease, queries } = makeClient();

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
    assert.ok(clientRelease.calledOnce, 'should release client on error');
  });

  it('should pass lockId as string parameter', async () => {
    const { params } = makeClient();

    const pool = new pg.Pool({ connectionString: 'postgresql://localhost/test' });
    const context = createUmzeptionPgContext(pool);

    await withAdvisoryLock(context, 99, async () => {});

    assert.equal(params.length, 2);
    assert.deepEqual(params[0], ['99']);
    assert.deepEqual(params[1], ['99']);
  });

  it('should reject non-integer lockId', async () => {
    const pool = new pg.Pool({ connectionString: 'postgresql://localhost/test' });
    const context = createUmzeptionPgContext(pool);

    await assert.rejects(
      () => withAdvisoryLock(context, 1.5, async () => {}),
      /Invalid lockId.*Must be a safe integer/
    );
  });

  it('should reject NaN lockId', async () => {
    const pool = new pg.Pool({ connectionString: 'postgresql://localhost/test' });
    const context = createUmzeptionPgContext(pool);

    await assert.rejects(
      () => withAdvisoryLock(context, Number.NaN, async () => {}),
      /Invalid lockId.*Must be a safe integer/
    );
  });

  it('should reject Infinity lockId', async () => {
    const pool = new pg.Pool({ connectionString: 'postgresql://localhost/test' });
    const context = createUmzeptionPgContext(pool);

    await assert.rejects(
      () => withAdvisoryLock(context, Number.POSITIVE_INFINITY, async () => {}),
      /Invalid lockId.*Must be a safe integer/
    );
  });

  it('should reject unsafe integer lockId', async () => {
    const pool = new pg.Pool({ connectionString: 'postgresql://localhost/test' });
    const context = createUmzeptionPgContext(pool);

    await assert.rejects(
      () => withAdvisoryLock(context, Number.MAX_SAFE_INTEGER + 1, async () => {}),
      /Invalid lockId.*Must be a safe integer/
    );
  });

  it('should return the value from fn', async () => {
    makeClient();

    const pool = new pg.Pool({ connectionString: 'postgresql://localhost/test' });
    const context = createUmzeptionPgContext(pool);

    const result = await withAdvisoryLock(context, 1, async () => ({ migrated: 5 }));

    assert.deepEqual(result, { migrated: 5 });
  });

  it('should set lock_timeout when lockTimeoutMs is provided', async () => {
    const { queries } = makeClient();

    const pool = new pg.Pool({ connectionString: 'postgresql://localhost/test' });
    const context = createUmzeptionPgContext(pool);

    await withAdvisoryLock(context, 1, async () => {}, { lockTimeoutMs: 5000 });

    assert.equal(queries[0], 'SET lock_timeout = 5000');
    assert.ok(queries[1]?.includes('pg_advisory_lock'), 'should acquire lock after timeout set');
  });

  it('should not throw when unlock fails (best-effort)', async () => {
    const clientRelease = sinon.stub();
    let callCount = 0;
    const clientQuery = sinon.stub().callsFake(async () => {
      callCount++;
      // Fail on the unlock (second query)
      if (callCount === 2) throw new Error('connection lost');
      return { rows: [] };
    });

    sinon.stub(pg.Pool.prototype, 'connect').resolves({
      query: clientQuery,
      release: clientRelease,
    });

    const pool = new pg.Pool({ connectionString: 'postgresql://localhost/test' });
    const context = createUmzeptionPgContext(pool);

    const result = await withAdvisoryLock(context, 1, async () => 'ok');

    assert.equal(result, 'ok');
    assert.ok(clientRelease.calledOnce, 'should still release client');
  });
});
