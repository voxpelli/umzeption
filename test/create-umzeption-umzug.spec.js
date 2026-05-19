import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sinon from 'sinon';

import { Umzug, memoryStorage } from 'umzug';

import { createUmzeptionContext, createUmzeptionUmzug } from '../index.js';

const testDir = path.dirname(fileURLToPath(import.meta.url));

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

    // The fixture filenames already happen to be in lexicographic order, so
    // this assertion validates the wiring (lookup → resolveMigrations → Umzug)
    // and the default sort stability. Non-trivial sort behavior is covered in
    // resolve-migrations-sort.spec.js.
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

  it('defaults create.folder to the directory of options.umzeption.meta', () => {
    const context = createUmzeptionContext('unknown', 'test');

    const umzug = createUmzeptionUmzug({
      umzeption: { glob: [], meta: import.meta },
      context,
      storage: memoryStorage(),
    });

    assert.strictEqual(
      /** @type {any} */ (umzug).options.create.folder,
      testDir,
      'expected create.folder to default to the directory containing import.meta.url'
    );
  });

  it('caller-supplied create.folder overrides the default', () => {
    const context = createUmzeptionContext('unknown', 'test');

    const umzug = createUmzeptionUmzug({
      umzeption: { glob: [], meta: import.meta },
      context,
      storage: memoryStorage(),
      create: { folder: '/explicit/override' },
    });

    assert.strictEqual(
      /** @type {any} */ (umzug).options.create.folder,
      '/explicit/override'
    );
  });
});
