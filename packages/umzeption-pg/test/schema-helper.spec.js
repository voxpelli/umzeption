import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import sinon from 'sinon';

import { installSchemaFromString, createUmzeptionContext } from 'umzeption';
import { pgInstallSchemaFromString, createUmzeptionPgContext } from '../index.js';

import pg from 'pg';

describe('schema-helper', () => {
  describe('pgInstallSchemaFromString', () => {
    it('should execute a single CREATE TABLE statement', async () => {
      const queryStub = sinon.stub(pg.Pool.prototype, 'query').resolves({ rows: [] });
      sinon.stub(pg.Pool.prototype, 'connect').resolves({
        query: queryStub,
        release: sinon.stub(),
      });

      const pool = new pg.Pool({ connectionString: 'postgresql://localhost/test' });
      const context = createUmzeptionPgContext(pool);

      await pgInstallSchemaFromString(context, 'CREATE TABLE foo (id SERIAL PRIMARY KEY);');

      assert.ok(queryStub.calledWith('CREATE TABLE foo (id SERIAL PRIMARY KEY)'), 'should call query with CREATE TABLE');

      sinon.restore();
    });

    it('should execute multiple CREATE TABLE statements', async () => {
      /** @type {string[]} */
      const queries = [];
      const queryStub = sinon.stub().callsFake(async (/** @type {string} */ sql) => {
        queries.push(sql);
        return { rows: [] };
      });
      sinon.stub(pg.Pool.prototype, 'connect').resolves({
        query: queryStub,
        release: sinon.stub(),
      });

      const pool = new pg.Pool({ connectionString: 'postgresql://localhost/test' });
      const context = createUmzeptionPgContext(pool);

      await pgInstallSchemaFromString(context, `
CREATE TABLE foo (id SERIAL PRIMARY KEY);

CREATE TABLE bar (id SERIAL PRIMARY KEY);
      `);

      const createStatements = queries.filter(q => typeof q === 'string' && q.startsWith('CREATE TABLE'));
      assert.equal(createStatements.length, 2, 'should execute 2 CREATE TABLE statements');

      sinon.restore();
    });

    it('should handle SQL with single-line comments between statements', async () => {
      /** @type {string[]} */
      const queries = [];
      const queryStub = sinon.stub().callsFake(async (/** @type {string} */ sql) => {
        queries.push(sql);
        return { rows: [] };
      });
      sinon.stub(pg.Pool.prototype, 'connect').resolves({
        query: queryStub,
        release: sinon.stub(),
      });

      const pool = new pg.Pool({ connectionString: 'postgresql://localhost/test' });
      const context = createUmzeptionPgContext(pool);

      await pgInstallSchemaFromString(context, `
CREATE TABLE foo (id SERIAL PRIMARY KEY);

-- This is a comment before the next table
CREATE TABLE bar (name TEXT NOT NULL);
      `);

      const createStatements = queries.filter(q => typeof q === 'string' && q.startsWith('CREATE TABLE'));
      assert.equal(createStatements.length, 2, 'should execute 2 CREATE TABLE statements ignoring comments');

      sinon.restore();
    });

    it('should rollback and re-throw if a statement fails', async () => {
      const queryStub = sinon.stub().callsFake(async (sql) => {
        if (typeof sql === 'string' && sql.startsWith('CREATE TABLE')) {
          throw new Error('Table already exists');
        }
        return { rows: [] };
      });
      sinon.stub(pg.Pool.prototype, 'connect').resolves({
        query: queryStub,
        release: sinon.stub(),
      });

      const pool = new pg.Pool({ connectionString: 'postgresql://localhost/test' });
      const context = createUmzeptionPgContext(pool);

      await assert.rejects(
        () => pgInstallSchemaFromString(context, 'CREATE TABLE foo (id SERIAL PRIMARY KEY);'),
        /Transaction rolled back/
      );

      sinon.restore();
    });
  });

  describe('installSchemaFromString', () => {
    it('should delegate to pgInstallSchemaFromString for pg context', async () => {
      const queryStub = sinon.stub(pg.Pool.prototype, 'query').resolves({ rows: [] });
      sinon.stub(pg.Pool.prototype, 'connect').resolves({
        query: queryStub,
        release: sinon.stub(),
      });

      const pool = new pg.Pool({ connectionString: 'postgresql://localhost/test' });
      const context = createUmzeptionPgContext(pool);

      await assert.doesNotReject(
        () => installSchemaFromString(/** @type {import('umzeption').AnyUmzeptionContext} */ (/** @type {unknown} */ (context)), 'CREATE TABLE foo (id SERIAL PRIMARY KEY);')
      );

      sinon.restore();
    });

    it('should throw for unsupported context types', async () => {
      const context = createUmzeptionContext('unknown', {});

      await assert.rejects(
        () => installSchemaFromString(context, 'CREATE TABLE foo (id SERIAL PRIMARY KEY);'),
        /Unsupported context type: unknown/
      );
    });
  });
});
