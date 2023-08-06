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
      'main:install',
      'test-dependency|foo-01.js',
      'main|foo-01.js',
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
      'main:install',
      'test-dependency|foo-01.js',
      'main|foo-01.js',
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
      'main:install',
      'test-dependency|foo-01.js',
      'main|foo-01.js',
    ]);

    assert.deepEqual(
      getDependencyStubCallCount(),
      expectedCallCount,
      'Unexpected calls of dependency stubs'
    );

    assert.strictEqual(installSchema.callCount, 1);
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
      'main:install',
      'test-dependency|foo-01.js',
    ]);

    assert.deepEqual(
      getDependencyStubCallCount(),
      expectedCallCount,
      'Unexpected calls of dependency stubs'
    );
  });
});
