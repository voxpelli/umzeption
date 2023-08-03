import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import sinon from 'sinon';

import { Umzug, memoryStorage } from 'umzug';

import { umzeption } from '../index.js';

import { down as downMain, up as upMain } from './fixtures/migrations/foo-01.js';
import { down as downTestDependency, up as upTestDependency } from './fixtures/test-dependency/migrations/foo-01.js';

function getMigrationStubCallCount (addToUp = 0, addToDown = 0) {
  return {
    downMain: downMain.callCount + addToDown,
    downTestDependency: downTestDependency.callCount + addToDown,
    upMain: upMain.callCount + addToUp,
    upTestDependency: upTestDependency.callCount + addToUp,
  };
}

describe('Integration', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('main', () => {
    it('should resolve dependencies and create proper migrations', async () => {
      const context = {};
      const storage = memoryStorage();

      const expectedCallCount = getMigrationStubCallCount(1);

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
        'test-dependency|foo-01.js',
        'main|foo-01.js',
      ]);

      assert.deepEqual(
        getMigrationStubCallCount(),
        expectedCallCount,
        'Unexpected call count of migration stubs'
      );
    });

    it('should resolve dependencies and noop register all migrations', async () => {
      const context = {};
      const storage = memoryStorage();

      const expectedCallCount = getMigrationStubCallCount();

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
        'test-dependency|foo-01.js',
        'main|foo-01.js',
      ]);

      assert.deepEqual(
        getMigrationStubCallCount(),
        expectedCallCount,
        'Unexpected calls to migration stubs'
      );
    });
  });
});
