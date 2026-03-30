import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import sinon from 'sinon';

import { memoryStorage } from 'umzug';

import { createUmzeptionContext, umzeptionPending } from '../index.js';

describe('umzeptionPending', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('should return all migrations when none are executed', async () => {
    const context = createUmzeptionContext('unknown', 'test');
    /** @type {any} */
    const storage = memoryStorage();

    const pending = await umzeptionPending({
      dependencies: ['./fixtures/test-dependency'],
      glob: ['fixtures/migrations/*.js'],
      meta: import.meta,
    }, storage, context);

    assert.deepStrictEqual(pending, [
      'test-dependency:install',
      ':install',
      'test-dependency|foo-01.js',
      'foo-01.js',
    ]);
  });

  it('should exclude already-executed migrations', async () => {
    const context = createUmzeptionContext('unknown', 'test');
    /** @type {any} */
    const storage = memoryStorage();

    // Pre-log some migrations as executed
    await storage.logMigration({ name: 'test-dependency:install', context });
    await storage.logMigration({ name: ':install', context });
    await storage.logMigration({ name: 'test-dependency|foo-01.js', context });

    const pending = await umzeptionPending({
      dependencies: ['./fixtures/test-dependency'],
      glob: ['fixtures/migrations/*.js'],
      meta: import.meta,
    }, storage, context);

    assert.deepStrictEqual(pending, [
      'foo-01.js',
    ]);
  });

  it('should return empty array when all migrations are executed', async () => {
    const context = createUmzeptionContext('unknown', 'test');
    /** @type {any} */
    const storage = memoryStorage();

    // Pre-log all migrations as executed
    await storage.logMigration({ name: 'test-dependency:install', context });
    await storage.logMigration({ name: ':install', context });
    await storage.logMigration({ name: 'test-dependency|foo-01.js', context });
    await storage.logMigration({ name: 'foo-01.js', context });

    const pending = await umzeptionPending({
      dependencies: ['./fixtures/test-dependency'],
      glob: ['fixtures/migrations/*.js'],
      meta: import.meta,
    }, storage, context);

    assert.deepStrictEqual(pending, []);
  });

  it('should work without dependencies', async () => {
    const context = createUmzeptionContext('unknown', 'test');
    /** @type {any} */
    const storage = memoryStorage();

    const pending = await umzeptionPending({
      glob: ['fixtures/migrations/*.js'],
      meta: import.meta,
    }, storage, context);

    assert.deepStrictEqual(pending, [
      ':install',
      'foo-01.js',
    ]);
  });
});
