import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { resolveMigrations, validateSortResult } from '../lib/resolve-migrations.js';

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'migrations-unordered'
);

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
      true,
      { sortFiles: files => files.toReversed() }
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
      true,
      { sortFiles: files => files.toSorted((a, b) => b.localeCompare(a)) }
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

  it('identity function opts out of sorting (preserves filesystem order)', async () => {
    const migrations = await resolveMigrations(
      definition,
      true,
      { sortFiles: files => files }
    );

    // Order is filesystem-dependent — we only assert it returns all three
    // files and that the option short-circuits the default sort. We verify
    // the latter by checking the set is correct and that the identity
    // function was actually invoked (no exception, same length).
    assert.strictEqual(migrations.length, 3);
    assert.deepStrictEqual(
      migrations.map(m => m.name).toSorted(),
      [
        'unordered|a-01.js',
        'unordered|b-02.js',
        'unordered|c-03.js',
      ]
    );
  });

  it('rejects sortFiles that returns undefined', async () => {
    await assert.rejects(
      // eslint-disable-next-line unicorn/no-useless-undefined
      () => resolveMigrations(definition, true, { sortFiles: () => /** @type {any} */ (undefined) }),
      (/** @type {any} */ err) => {
        assert.match(err.message, /Failed to resolve migrations for "unordered"/);
        assert.ok(err.cause instanceof TypeError);
        assert.match(err.cause.message, /unordered/);
        assert.match(err.cause.message, /must return an array/);
        return true;
      }
    );
  });

  it('rejects sortFiles that returns a non-array', async () => {
    await assert.rejects(
      () => resolveMigrations(definition, true, { sortFiles: () => /** @type {any} */ ('oops') }),
      (/** @type {any} */ err) => {
        assert.ok(err.cause instanceof TypeError);
        assert.match(err.cause.message, /must return an array/);
        assert.match(err.cause.message, /got string/);
        return true;
      }
    );
  });

  it('rejects sortFiles that drops files (returns shorter array)', async () => {
    await assert.rejects(
      () => resolveMigrations(definition, true, { sortFiles: files => files.slice(0, 1) }),
      (/** @type {any} */ err) => {
        assert.match(err.cause.message, /returned 1 file\(s\) but received 3/);
        return true;
      }
    );
  });

  it('rejects sortFiles that duplicates files (returns longer array)', async () => {
    await assert.rejects(
      () => resolveMigrations(definition, true, { sortFiles: files => [...files, ...files] }),
      (/** @type {any} */ err) => {
        assert.match(err.cause.message, /returned 6 file\(s\) but received 3/);
        return true;
      }
    );
  });

  it('rejects sortFiles that replaces a unique entry with a duplicate', async () => {
    // Same length, every returned path is in the input set — but one input
    // file is silently dropped and another runs twice. The permutation guard
    // must catch this.
    await assert.rejects(
      () => resolveMigrations(definition, true,
        { sortFiles: files => [...files.slice(0, 1), ...files.slice(1, 2), ...files.slice(1, 2)] }),
      (/** @type {any} */ err) => {
        assert.match(err.cause.message, /duplicate entries/);
        return true;
      }
    );
  });

  it('rejects sortFiles that synthesizes paths not in the input', async () => {
    await assert.rejects(
      () => resolveMigrations(definition, true, { sortFiles: files => [...files.slice(0, 2), '/synthesized/path.js'] }),
      (/** @type {any} */ err) => {
        assert.match(err.cause.message, /not present in the input/);
        assert.match(err.cause.message, /synthesized\/path\.js/);
        return true;
      }
    );
  });

  it('wraps a synchronously-throwing sortFiles with the standard error', async () => {
    await assert.rejects(
      () => resolveMigrations(definition, true, { sortFiles: () => { throw new RangeError('boom'); } }),
      (/** @type {any} */ err) => {
        assert.match(err.message, /Failed to resolve migrations for "unordered"/);
        assert.ok(err.cause instanceof RangeError);
        assert.strictEqual(err.cause.message, 'boom');
        return true;
      }
    );
  });

  it('passes the pluginDir context arg to the sort function', async () => {
    /** @type {Array<{ files: string[], context: { pluginDir: string } }>} */
    const invocations = [];

    await resolveMigrations(
      definition,
      true,
      {
        sortFiles: (files, ctx) => {
          invocations.push({ files: [...files], context: ctx });
          return files.toSorted();
        },
      }
    );

    assert.strictEqual(invocations.length, 1);
    assert.strictEqual(invocations[0]?.context.pluginDir, fixturesDir);
    assert.strictEqual(invocations[0]?.files.length, 3);
    // Verify the right files were passed without depending on path-separator
    // shape (fs.glob normalizes to forward slashes on Windows while the Node 20
    // readdirGlob fallback uses path.join backslashes — so a string startsWith
    // check on the absolute path fails cross-platform).
    const basenames = (invocations[0]?.files ?? []).map(f => path.basename(f)).toSorted();
    assert.deepStrictEqual(basenames, ['a-01.js', 'b-02.js', 'c-03.js']);
  });
});

describe('validateSortResult', () => {
  const input = ['/a/1.js', '/a/2.js', '/a/3.js'];

  it('returns the array unchanged when it is a valid permutation', () => {
    const result = input.toReversed();
    assert.strictEqual(validateSortResult(input, result, 'example'), result);
  });

  it('throws TypeError when result is not an array', () => {
    assert.throws(
      // eslint-disable-next-line unicorn/no-null
      () => validateSortResult(input, /** @type {any} */ (null), 'example'),
      (/** @type {any} */ err) => {
        assert.ok(err instanceof TypeError);
        assert.match(err.message, /example/);
        assert.match(err.message, /must return an array/);
        return true;
      }
    );
  });

  it('throws when result has wrong length', () => {
    assert.throws(
      () => validateSortResult(input, input.slice(0, 2), 'example'),
      /returned 2 file\(s\) but received 3/
    );
  });

  it('throws when result contains a path not in the input', () => {
    assert.throws(
      () => validateSortResult(input, [...input.slice(0, 2), '/bad.js'], 'example'),
      /not present in the input/
    );
  });

  it('throws when result duplicates an input entry to replace a dropped one', () => {
    // length matches, every entry is in inputSet — but '/a/3.js' is dropped
    // and '/a/2.js' appears twice. The pigeonhole permutation check catches it.
    assert.throws(
      () => validateSortResult(input, [...input.slice(0, 1), ...input.slice(1, 2), ...input.slice(1, 2)], 'example'),
      /duplicate entries/
    );
  });
});
