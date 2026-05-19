import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import sinon from 'sinon';

import { Umzug, memoryStorage } from 'umzug';

import { createUmzeptionContext, umzeption } from '../index.js';

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

describe('Integration', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('should resolve dependencies and create proper migrations', async () => {
    const context = createUmzeptionContext('unknown', 'test');

    const storage = memoryStorage();

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

    const executed = await storage.executed({ context });

    assert.deepStrictEqual(executed, [
      'test-dependency:install',
      ':install',
      'test-dependency|foo-01.js',
      'foo-01.js',
    ]);

    assert.deepEqual(
      getDependencyStubCallCount(),
      expectedCallCount,
      'Unexpected call count of dependency stubs'
    );
  });

  it('should support noop registering all migrations', async () => {
    const context = createUmzeptionContext('unknown', 'test');

    const storage = memoryStorage();

    const expectedCallCount = getDependencyStubCallCount();

    const umzug = new Umzug({
      migrations: umzeption({
        dependencies: ['./fixtures/test-dependency'],
        glob: ['fixtures/migrations/*.js'],
        meta: import.meta,
        noop: true,
      }),
      context,
      storage,
      logger: sinon.stub(console),
    });

    await umzug.up();

    const executed = await storage.executed({ context });

    assert.deepStrictEqual(executed, [
      'test-dependency:install',
      ':install',
      'test-dependency|foo-01.js',
      'foo-01.js',
    ]);

    assert.deepEqual(
      getDependencyStubCallCount(),
      expectedCallCount,
      'Unexpected calls to dependency stubs'
    );
  });

  it('should support install mode', async () => {
    const context = createUmzeptionContext('unknown', 'test');

    const storage = memoryStorage();

    const expectedCallCount = getDependencyStubCallCount({ installSchema: 1 });

    const installSchema = sinon.stub();

    const umzug = new Umzug({
      migrations: umzeption({
        dependencies: ['./fixtures/test-dependency'],
        glob: ['fixtures/migrations/*.js'],
        meta: import.meta,
        install: true,
        installSchema,
      }),
      context,
      storage,
      logger: sinon.stub(console),
    });

    await umzug.up();

    const executed = await storage.executed({ context });

    assert.deepStrictEqual(executed, [
      'test-dependency:install',
      ':install',
      'test-dependency|foo-01.js',
      'foo-01.js',
    ]);

    assert.deepEqual(
      getDependencyStubCallCount(),
      expectedCallCount,
      'Unexpected calls of dependency stubs'
    );

    assert.strictEqual(installSchema.callCount, 1);
  });

  it('should honour a custom sortFiles option end-to-end', async () => {
    const context = createUmzeptionContext('unknown', 'test');

    const storage = memoryStorage();

    const umzug = new Umzug({
      migrations: umzeption({
        // Use the three-file unordered fixture so sort has visible effect.
        glob: ['fixtures/migrations-unordered/*.js'],
        meta: import.meta,
        noop: true,
        sortFiles: files => [...files].sort((a, b) => b.localeCompare(a)),
      }),
      context,
      storage,
      logger: sinon.stub(console),
    });

    await umzug.up();

    const executed = await storage.executed({ context });

    // ':install' is added by lookup separately and not affected by sortFiles.
    // The three migration files appear in reverse-lexicographic order.
    assert.deepStrictEqual(executed, [
      ':install',
      'c-03.js',
      'b-02.js',
      'a-01.js',
    ]);
  });

  it('per-dependency sortFiles wins over top-level sortFiles', async () => {
    const context = createUmzeptionContext('unknown', 'test');

    const storage = memoryStorage();

    const umzug = new Umzug({
      migrations: umzeption({
        // The dep below exports its own sortFiles (reverse). Top-level
        // tries to force forward order; per-dep must still win.
        dependencies: ['./fixtures/test-dependency-with-sort'],
        meta: import.meta,
        noop: true,
        sortFiles: files => [...files].sort(),
      }),
      context,
      storage,
      logger: sinon.stub(console),
    });

    await umzug.up();

    const executed = await storage.executed({ context });

    // Dep's own sortFiles (reverse) wins over the top-level (forward).
    // ':install' is the main app's stub (no glob → no migrations).
    assert.deepStrictEqual(executed, [
      'test-dependency-with-sort:install',
      ':install',
      'test-dependency-with-sort|c-03.js',
      'test-dependency-with-sort|b-02.js',
      'test-dependency-with-sort|a-01.js',
    ]);
  });

  it('should work without specifying top level installSchema', async () => {
    const context = createUmzeptionContext('unknown', 'test');

    const storage = memoryStorage();

    const expectedCallCount = getDependencyStubCallCount({ installSchema: 1 });

    const umzug = new Umzug({
      migrations: umzeption({
        dependencies: ['./fixtures/test-dependency'],
        meta: import.meta,
        install: true,
      }),
      context,
      storage,
      logger: sinon.stub(console),
    });

    await umzug.up();

    const executed = await storage.executed({ context });

    assert.deepStrictEqual(executed, [
      'test-dependency:install',
      ':install',
      'test-dependency|foo-01.js',
    ]);

    assert.deepEqual(
      getDependencyStubCallCount(),
      expectedCallCount,
      'Unexpected calls of dependency stubs'
    );
  });
});
