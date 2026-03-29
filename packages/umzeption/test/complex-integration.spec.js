import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import sinon from 'sinon';

import { Umzug, memoryStorage } from 'umzug';

import { createUmzeptionContext, umzeption } from '../index.js';

import { down as downMain, up as upMain } from './fixtures/migrations/foo-01.js';

import { installSchema as installSchemaTestDependency } from './fixtures/test-dependency/index.js';
import { down as downTestDependency, up as upTestDependency } from './fixtures/test-dependency/migrations/foo-01.js';

import { installSchema as installSchemaTestDependency2 } from './fixtures/test-dependency-2/index.js';
import { down as downTestDependency2, up as upTestDependency2 } from './fixtures/test-dependency-2/migrations/bar-01.js';

import { umzeptionConfig as umzeptionConfigTestDependency3 } from './fixtures/test-dependency-3/index.js';
import { down as downTestDependency3, up as upTestDependency3 } from './fixtures/test-dependency-3/migrations/abc-01.js';

function getDependencyStubCallCount ({
  down = 0,
  installSchema = 0,
  up = 0,
} = {}) {
  return {
    downMain: downMain.callCount + down,
    downTestDependency: downTestDependency.callCount + down,
    downTestDependency2: downTestDependency2.callCount + down,
    downTestDependency3: downTestDependency3.callCount + down,

    installSchemaTestDependency: installSchemaTestDependency.callCount + installSchema,
    installSchemaTestDependency2: installSchemaTestDependency2.callCount + installSchema,
    installSchemaTestDependency3: umzeptionConfigTestDependency3.installSchema.callCount + installSchema,

    upMain: upMain.callCount + up,
    upTestDependency: upTestDependency.callCount + up,
    upTestDependency2: upTestDependency2.callCount + up,
    upTestDependency3: upTestDependency3.callCount + up,
  };
}

describe('Complex Integration', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('should run full dependency tree without running anything twice', async () => {
    const context = createUmzeptionContext('unknown', 'test');
    const storage = memoryStorage();

    const expectedCallCount = getDependencyStubCallCount({ up: 1 });

    const umzug = new Umzug({
      migrations: umzeption({
        dependencies: ['./fixtures/test-dependency-3'],
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
      'test-dependency-2:install',
      'test-dependency-3:install',
      ':install',
      'test-dependency|foo-01.js',
      'test-dependency-2|bar-01.js',
      'test-dependency-3|abc-01.js',
      'foo-01.js',
    ]);

    assert.deepEqual(
      getDependencyStubCallCount(),
      expectedCallCount,
      'Unexpected call count of dependency stubs'
    );
  });
});
