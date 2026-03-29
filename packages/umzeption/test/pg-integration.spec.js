import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import sinon from 'sinon';

import pg from 'pg';
import { Umzug } from 'umzug';

import { UmzeptionPgStorage, createUmzeptionPgContext, umzeption } from '../index.js';

import { down as downMain, up as upMain } from './fixtures/migrations/foo-01.js';
import { installSchema as installSchemaTestDependency } from './fixtures/test-dependency/index.js';
import { down as downTestDependency, up as upTestDependency } from './fixtures/test-dependency/migrations/foo-01.js';

function getDependencyStubCallCount ({
  down = 0,
  installSchema = 0,
  up = 0,
} = {}) {
  return {
    downMain: downMain.callCount + down,
    downTestDependency: downTestDependency.callCount + down,
    installSchemaTestDependency: installSchemaTestDependency.callCount + installSchema,
    upMain: upMain.callCount + up,
    upTestDependency: upTestDependency.callCount + up,
  };
}

describe('PG Integration', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('should resolve dependencies and create proper migrations', async () => {
    const queryStub = sinon.stub(pg.Pool.prototype, 'query').resolves({ rows: [] });

    const context = createUmzeptionPgContext(new pg.Pool({
      connectionString: 'postgresql://dbuser:secretpassword@localhost:3211/mydb',
    }));

    const storage = new UmzeptionPgStorage();

    const expectedCallCount = getDependencyStubCallCount({ up: 1 });

    const umzug = new Umzug({
      migrations: umzeption({
        dependencies: ['./fixtures/test-dependency'],
        glob: ['fixtures/migrations/*.js'],
        meta: import.meta,
      }),
      context,
      storage,
      logger: sinon.stub(console),
    });

    await umzug.up();

    assert.deepEqual(
      getDependencyStubCallCount(),
      expectedCallCount,
      'Unexpected call count of dependency stubs'
    );

    assert.deepStrictEqual(queryStub.args, [
      [
        '\n' +
          '      CREATE TABLE IF NOT EXISTS umzeption_migrations (\n' +
          '        name VARCHAR(255) PRIMARY KEY,\n' +
          '        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP\n' +
          '      )\n' +
          '    ',
        [],
      ],
      [
        'SELECT name FROM umzeption_migrations',
        [],
      ],
      [
        'INSERT INTO umzeption_migrations (name) VALUES ($1)',
        [
          'test-dependency:install',
        ],
      ],
      [
        'INSERT INTO umzeption_migrations (name) VALUES ($1)',
        [
          ':install',
        ],
      ],
      [
        'INSERT INTO umzeption_migrations (name) VALUES ($1)',
        [
          'test-dependency|foo-01.js',
        ],
      ],
      [
        'INSERT INTO umzeption_migrations (name) VALUES ($1)',
        [
          'foo-01.js',
        ],
      ],
    ]);
  });
});
