import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sinon from 'sinon';

import { Umzug, memoryStorage } from 'umzug';

import { createUmzeption, createUmzeptionContext } from '../index.js';

import { up as upMain } from './fixtures/migrations/foo-01.js';
import { installSchema as installSchemaTestDependency } from './fixtures/test-dependency/index.js';
import { up as upTestDependency } from './fixtures/test-dependency/migrations/foo-01.js';

const testDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Capture current callCount baselines for fixture stubs so each test
 * can assert deltas instead of absolute counts (fixture stubs are
 * module-scoped and shared across the whole test run).
 */
function snapshotCallCounts () {
  return {
    installSchema: installSchemaTestDependency.callCount,
    upMain: upMain.callCount,
    upTestDependency: upTestDependency.callCount,
  };
}

/** @param {any} [overrides] */
function buildInstance (overrides = {}) {
  const context = createUmzeptionContext('unknown', 'test');

  return createUmzeption({
    umzeption: {
      dependencies: ['./fixtures/test-dependency'],
      glob: ['fixtures/migrations/*.js'],
      meta: import.meta,
      ...overrides.umzeption,
    },
    context,
    storage: overrides.storage ?? memoryStorage(),
    logger: sinon.stub(console),
    ...overrides.extras,
  });
}

describe('createUmzeption', () => {
  afterEach(() => {
    sinon.restore();
  });

  // --- Shape ---

  it('returns { umzug, installUmzug (lazy getter), runAsCLI }', () => {
    const instance = buildInstance();

    assert.ok(instance.umzug instanceof Umzug, 'umzug should be an Umzug instance');
    assert.strictEqual(typeof instance.runAsCLI, 'function', 'runAsCLI should be a function');

    const descriptor = Object.getOwnPropertyDescriptor(instance, 'installUmzug');
    assert.ok(descriptor, 'installUmzug descriptor should exist');
    assert.strictEqual(typeof descriptor.get, 'function', 'installUmzug should be a getter, not an eager field');
  });

  // --- Migration wiring (ported from create-umzeption-umzug.spec.js) ---

  it('.umzug.pending() resolves migrations through umzeption', async () => {
    const instance = buildInstance({
      umzeption: {
        dependencies: undefined,
        glob: ['fixtures/migrations-unordered/*.js'],
        noop: true,
      },
    });

    /** @type {Array<{ name: string }>} */
    const pending = await instance.umzug.pending();

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

  // --- Folder inference (ported verbatim, accessed via instance.umzug.options.create.folder) ---

  it('defaults create.folder to the directory of options.umzeption.meta', () => {
    const instance = buildInstance({
      umzeption: { dependencies: undefined, glob: [] },
    });

    assert.strictEqual(
      /** @type {any} */ (instance.umzug).options.create.folder,
      testDir
    );
  });

  it('defaults create.folder to options.umzeption.cwd when meta is absent', () => {
    const instance = buildInstance({
      umzeption: {
        dependencies: undefined,
        glob: [],
        meta: undefined,
        cwd: '/fixture/cwd',
      },
    });

    assert.strictEqual(
      /** @type {any} */ (instance.umzug).options.create.folder,
      '/fixture/cwd'
    );
  });

  it('defaults create.folder to process.cwd() when neither meta nor cwd is set', () => {
    const instance = buildInstance({
      umzeption: { dependencies: undefined, glob: [], meta: undefined },
    });

    assert.strictEqual(
      /** @type {any} */ (instance.umzug).options.create.folder,
      process.cwd()
    );
  });

  it('caller-supplied create.folder overrides the default', () => {
    const instance = buildInstance({
      umzeption: { dependencies: undefined, glob: [] },
      extras: { create: { folder: '/explicit/override' } },
    });

    assert.strictEqual(
      /** @type {any} */ (instance.umzug).options.create.folder,
      '/explicit/override'
    );
  });

  it('caller-supplied create.folder=undefined falls back to the inferred default', () => {
    const instance = buildInstance({
      umzeption: { dependencies: undefined, glob: [] },
      // Bypass exactOptionalPropertyTypes to exercise the runtime
      // spread-with-undefined footgun a CLI-arg-forwarding caller could trigger.
      extras: { create: /** @type {any} */ ({ folder: undefined }) },
    });

    assert.strictEqual(
      /** @type {any} */ (instance.umzug).options.create.folder,
      testDir
    );
  });

  it('wraps fileURLToPath errors with actionable context when meta.url is not a file URL', () => {
    assert.throws(
      () => buildInstance({
        umzeption: {
          dependencies: undefined,
          glob: [],
          meta: /** @type {any} */ ({ url: 'https://example.com/tools/umzug.js' }),
        },
      }),
      (/** @type {any} */ err) => {
        assert.match(err.message, /createUmzeption/);
        assert.match(err.message, /could not derive folder from meta\.url/);
        assert.match(err.message, /https:\/\/example\.com/);
        assert.match(err.message, /pass umzeption\.cwd or create\.folder explicitly/);
        assert.ok(err.cause, 'expected cause chain preserved');
        return true;
      }
    );
  });

  // --- installUmzug lazy caching ---

  it('caches installUmzug on first access (strict-equal on subsequent reads)', () => {
    const instance = buildInstance();

    const first = instance.installUmzug;
    const second = instance.installUmzug;

    assert.strictEqual(first, second, 'installUmzug should return the same Umzug instance across reads');
  });

  it('installUmzug is install-mode (runs installSchema, NOT migration up)', async () => {
    const before = snapshotCallCounts();
    const storage = memoryStorage();
    const instance = buildInstance({ storage });

    await instance.installUmzug.up();

    const executed = await storage.executed({ context: createUmzeptionContext('unknown', 'test') });
    assert.deepStrictEqual(executed, [
      'test-dependency:install',
      ':install',
      'test-dependency|foo-01.js',
      'foo-01.js',
    ]);

    assert.strictEqual(
      installSchemaTestDependency.callCount - before.installSchema,
      1,
      'installSchema should be called once'
    );
    assert.strictEqual(
      upMain.callCount - before.upMain,
      0,
      'main migration up should NOT be called in install mode'
    );
    assert.strictEqual(
      upTestDependency.callCount - before.upTestDependency,
      0,
      'dependency migration up should NOT be called in install mode'
    );
  });

  // --- CLI dispatch ---

  it('runAsCLI([\'install\']) is install-mode end-to-end', async () => {
    const before = snapshotCallCounts();
    const storage = memoryStorage();
    const instance = buildInstance({ storage });

    await instance.runAsCLI(['install']);

    const executed = await storage.executed({ context: createUmzeptionContext('unknown', 'test') });
    assert.deepStrictEqual(executed, [
      'test-dependency:install',
      ':install',
      'test-dependency|foo-01.js',
      'foo-01.js',
    ]);

    assert.strictEqual(
      installSchemaTestDependency.callCount - before.installSchema,
      1,
      'installSchema should be called once via runAsCLI install'
    );
    assert.strictEqual(
      upMain.callCount - before.upMain,
      0,
      'main migration up should NOT be called via runAsCLI install'
    );
  });

  it('runAsCLI([\'up\']) is upgrade-mode (runs migrations, NOT installSchema)', async () => {
    const before = snapshotCallCounts();
    const storage = memoryStorage();
    const instance = buildInstance({ storage });

    await instance.runAsCLI(['up']);

    assert.strictEqual(
      installSchemaTestDependency.callCount - before.installSchema,
      0,
      'installSchema should NOT be called via runAsCLI up'
    );
    assert.strictEqual(
      upMain.callCount - before.upMain,
      1,
      'main migration up should be called once'
    );
    assert.strictEqual(
      upTestDependency.callCount - before.upTestDependency,
      1,
      'dependency migration up should be called once'
    );
  });

  it('runAsCLI([\'install\', ...flags]) translates argv to [\'up\', ...flags] for the install Umzug', async () => {
    const runAsCLIStub = sinon.stub(Umzug.prototype, 'runAsCLI').resolves(true);

    const instance = buildInstance();
    await instance.runAsCLI(['install', '--rerun', 'ALLOW']);

    assert.strictEqual(runAsCLIStub.callCount, 1);
    assert.deepStrictEqual(runAsCLIStub.firstCall.args[0], ['up', '--rerun', 'ALLOW']);
  });

  it('runAsCLI([\'pending\']) passes through unchanged to the upgrade-mode Umzug', async () => {
    const runAsCLIStub = sinon.stub(Umzug.prototype, 'runAsCLI').resolves(true);

    const instance = buildInstance();
    await instance.runAsCLI(['pending']);

    assert.strictEqual(runAsCLIStub.callCount, 1);
    assert.deepStrictEqual(runAsCLIStub.firstCall.args[0], ['pending']);
  });

  it('runAsCLI() without argv uses process.argv.slice(2)', async () => {
    const runAsCLIStub = sinon.stub(Umzug.prototype, 'runAsCLI').resolves(true);
    const originalArgv = process.argv;
    process.argv = ['node', 'script.js', 'pending'];

    try {
      const instance = buildInstance();
      await instance.runAsCLI();

      assert.strictEqual(runAsCLIStub.callCount, 1);
      assert.deepStrictEqual(runAsCLIStub.firstCall.args[0], ['pending']);
    } finally {
      process.argv = originalArgv;
    }
  });

  // --- this-binding regression guard ---

  it('destructured runAsCLI still routes install correctly (no this dependency)', async () => {
    const before = snapshotCallCounts();
    const storage = memoryStorage();
    const instance = buildInstance({ storage });

    const { runAsCLI } = instance;

    await assert.doesNotReject(() => runAsCLI(['install']));

    assert.strictEqual(
      installSchemaTestDependency.callCount - before.installSchema,
      1,
      'install branch must work when runAsCLI is destructured (regression guard for this.installUmzug)'
    );
  });
});
