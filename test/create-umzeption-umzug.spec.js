import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import sinon from 'sinon';

import { Umzug, memoryStorage } from 'umzug';

import { createUmzeptionContext, createUmzeptionUmzug } from '../index.js';

describe('createUmzeptionUmzug', () => {
  it('returns a configured Umzug instance', () => {
    const context = createUmzeptionContext('unknown', 'test');

    const umzug = createUmzeptionUmzug({
      umzeption: {
        dependencies: [],
        glob: ['fixtures/migrations/*.js'],
        meta: import.meta,
      },
      context,
      storage: memoryStorage(),
      logger: undefined,
    });

    assert.ok(umzug instanceof Umzug, 'expected an Umzug instance');
    assert.strictEqual(typeof umzug.runAsCLI, 'function', 'expected umzug.runAsCLI to be a function');
  });

  it('wires umzeption migration resolution through to umzug.pending()', async () => {
    const context = createUmzeptionContext('unknown', 'test');

    const umzug = createUmzeptionUmzug({
      umzeption: {
        glob: ['fixtures/migrations-unordered/*.js'],
        meta: import.meta,
        noop: true,
      },
      context,
      storage: memoryStorage(),
      logger: sinon.stub(console),
    });

    /** @type {Array<{ name: string }>} */
    const pending = await umzug.pending();

    assert.deepStrictEqual(
      pending.map(m => m.name),
      [
        ':install',
        'a-01.js',
        'b-02.js',
        'c-03.js',
      ]
    );
  });
});
