import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveMigrations, sortMigrationFiles } from '../lib/resolve-migrations.js';

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'migrations-unordered'
);

describe('sortMigrationFiles', () => {
  it('returns input sorted lexicographically', () => {
    assert.deepStrictEqual(
      sortMigrationFiles(['c-03.js', 'a-01.js', 'b-02.js']),
      ['a-01.js', 'b-02.js', 'c-03.js']
    );
  });

  it('does not mutate the input array', () => {
    const input = ['c-03.js', 'a-01.js', 'b-02.js'];
    sortMigrationFiles(input);
    assert.deepStrictEqual(input, ['c-03.js', 'a-01.js', 'b-02.js']);
  });

  it('handles empty input', () => {
    assert.deepStrictEqual(sortMigrationFiles([]), []);
  });
});

describe('resolveMigrations sort order', () => {
  it('returns migrations in lexicographic order regardless of filesystem order', async () => {
    const migrations = await resolveMigrations(
      {
        glob: ['*.js'],
        name: 'unordered',
        pluginDir: fixturesDir,
      },
      true // noop: avoid invoking the stub up/down
    );

    assert.deepStrictEqual(
      migrations.map(m => m.name),
      [
        'unordered|a-01.js',
        'unordered|b-02.js',
        'unordered|c-03.js',
      ]
    );
  });
});
