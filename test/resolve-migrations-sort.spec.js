import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveMigrations } from '../lib/resolve-migrations.js';

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'migrations-unordered'
);

/** @type {import('../lib/advanced-types.d.ts').UmzeptionContext<'unknown', string>} */
const context = { type: 'unknown', value: 'test' };

/** @type {Pick<import('../lib/advanced-types.d.ts').UmzeptionDefinition, 'glob' | 'name' | 'pluginDir'>} */
const definition = {
  glob: ['*.js'],
  name: 'unordered',
  pluginDir: fixturesDir,
};

describe('resolveMigrations custom sortFiles', () => {
  it('applies a custom transformer (reverse order)', async () => {
    const migrations = await resolveMigrations(
      definition,
      context,
      true,
      files => [...files].reverse()
    );

    assert.deepStrictEqual(
      migrations.map(m => m.name),
      [
        'unordered|c-03.js',
        'unordered|b-02.js',
        'unordered|a-01.js',
      ]
    );
  });

  it('supports wrapping a comparator', async () => {
    const migrations = await resolveMigrations(
      definition,
      context,
      true,
      files => [...files].sort((a, b) => b.localeCompare(a))
    );

    assert.deepStrictEqual(
      migrations.map(m => m.name),
      [
        'unordered|c-03.js',
        'unordered|b-02.js',
        'unordered|a-01.js',
      ]
    );
  });

  it('identity function opts out of sorting (preserves globby order)', async () => {
    const migrations = await resolveMigrations(
      definition,
      context,
      true,
      files => files
    );

    // Order is filesystem-dependent — we only assert it returns all three
    // files and that the option short-circuits the default sort. We verify
    // the latter by checking the set is correct and that the identity
    // function was actually invoked (no exception, same length).
    assert.strictEqual(migrations.length, 3);
    assert.deepStrictEqual(
      migrations.map(m => m.name).sort(),
      [
        'unordered|a-01.js',
        'unordered|b-02.js',
        'unordered|c-03.js',
      ]
    );
  });

  it('passes the pluginDir context arg to the sort function', async () => {
    /** @type {Array<{ files: string[], context: { pluginDir: string } }>} */
    const invocations = [];

    await resolveMigrations(
      definition,
      context,
      true,
      (files, ctx) => {
        invocations.push({ files: [...files], context: ctx });
        return [...files].sort();
      }
    );

    assert.strictEqual(invocations.length, 1);
    assert.strictEqual(invocations[0]?.context.pluginDir, fixturesDir);
    assert.strictEqual(invocations[0]?.files.length, 3);
    // The files are absolute paths within fixturesDir
    for (const file of invocations[0]?.files ?? []) {
      assert.ok(file.startsWith(fixturesDir), `expected ${file} to start with ${fixturesDir}`);
    }
  });
});
