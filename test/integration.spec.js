import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import sinon from 'sinon';

import { dirname } from 'desm';
import { Umzug, memoryStorage } from 'umzug';

import { umzeption } from '../index.js';

describe('Integration', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('main', () => {
    it('should resolve dependencies and create proper migrations', async () => {
      const context = {};
      const storage = memoryStorage();

      const umzug = new Umzug({
        migrations: umzeption({
          dependencies: ['./fixtures/test-dependency'],
          // TODO: SHould not be necessary?
          pluginDir: dirname(import.meta.url),
          glob: ['fixtures/migrations/*.js'],
          // TODO: SHould not be necessary
          name: 'main',
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
    });
  });
});
