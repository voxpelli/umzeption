# Umzeption

Umzeption is a recursive extension for [Umzug](https://github.com/sequelize/umzug). Every npm package in your dependency tree — including the host app itself — can ship its own DB migrations and an `installSchema()`; Umzeption discovers them, groups them per package (dependencies first, host app last), and runs them through Umzug. Fresh databases install each schema and mark migrations as applied; existing databases run only what's pending.

[![npm version](https://img.shields.io/npm/v/umzeption.svg?style=flat)](https://www.npmjs.com/package/umzeption)
[![npm downloads](https://img.shields.io/npm/dm/umzeption.svg?style=flat)](https://www.npmjs.com/package/umzeption)
[![neostandard javascript style](https://img.shields.io/badge/code_style-neostandard-7fffff?style=flat&labelColor=ff80ff)](https://github.com/neostandard/neostandard)
[![Module type: ESM](https://img.shields.io/badge/module%20type-esm-brightgreen)](https://github.com/voxpelli/badges-cjs-esm)
[![Types in JS](https://img.shields.io/badge/types_in_js-yes-brightgreen)](https://github.com/voxpelli/types-in-js)

## Usage

`createUmzeption` sets up migrations once and returns a CLI runner, a programmatic Umzug instance, and an install-mode Umzug — all from a single call. The typical setup splits across three files:

**`umzeption-setup.js`** — one module owns the setup:

```javascript
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import {
  UmzeptionPgStorage,
  createUmzeption,
  createUmzeptionPgContext,
  installSchemaFromString,
} from 'umzeption';

export function buildUmzeption (pool) {
  return createUmzeption({
    umzeption: {
      dependencies: ['@yikesable/foo'],
      glob: ['migrations/*.js'],
      meta: import.meta,
      installSchema: async ({ context }) => {
        const sql = await readFile(new URL('schema.sql', import.meta.url), 'utf8');
        return installSchemaFromString(context, sql);
      },
    },
    context: createUmzeptionPgContext(pool ?? new pg.Pool({
      allowExitOnIdle: true,
      connectionString: process.env.DATABASE_URL,
    })),
    storage: new UmzeptionPgStorage(),
    logger: console,
  });
}

export const umzeption = buildUmzeption();
```

**`tools/umzug.js`** — CLI entry point, one line of logic:

```javascript
import { umzeption } from '../umzeption-setup.js';

await umzeption.runAsCLI();
```

Then run:

```bash
node tools/umzug.js install    # fresh database: runs each package's installSchema()
node tools/umzug.js up         # applies any pending migrations
node tools/umzug.js pending    # lists pending migrations
node tools/umzug.js create --name add-users.js  # generates a new migration file
```

**`tools/test-helpers.js`** — pg-utils test bootstrap uses the install-mode Umzug directly:

```javascript
import { pgTestSetupFor } from '@voxpelli/pg-utils';

import { buildUmzeption } from '../umzeption-setup.js';

export const pgTestSetupConfig = {
  connectionString: process.env.DATABASE_URL,
  schema: pool => buildUmzeption(pool).installUmzug,
};

export async function testHelpers (t) {
  return pgTestSetupFor(pgTestSetupConfig, t);
}
```

`buildUmzeption(pool).installUmzug` gives [`@voxpelli/pg-utils`](https://github.com/voxpelli/pg-utils) a ready Umzug instance; pg-utils calls `.up()` on it to install the schema before each test.

For programmatic use (running migrations at app startup), reach for the `umzug` property directly:

```javascript
import { umzeption } from './umzeption-setup.js';
await umzeption.umzug.up();
```

If you need lower-level control — multiple Umzug instances, custom Umzug options, no helper at all — compose Umzug manually. The annotated example below also serves as a reference for every umzeption option:

```javascript
import pg from 'pg';
import {
  UmzeptionPgStorage,
  createUmzeptionPgContext,
  umzeption,
} from 'umzeption';
import { Umzug } from 'umzug';

const umzug = new Umzug({
  migrations: umzeption({
    // Which dependencies we want to install migrations and schemas from
    dependencies: [
      '@yikesable/foo',
      '@yikesable/bar',
    ],
    // Optional: Which migrations do we have ourselves?
    glob: ['migrations/*.js'],
    // Optional: Sets up this package's schema on fresh installs (when install: true is set)
    async installSchema ({ context }) {},
    // Optional: Set to true if it should be a fresh install rather than a migration
    install: true,
    // Optional: Used to inform where to resolve "glob" from
    meta: import.meta,
    // Optional: Can be used instead of "meta" and if none are set, then process.cwd() is the default
    // cwd: process.cwd(),
    // Optional: Custom sort for migration file paths. Receives absolute paths
    // plus `{ pluginDir }` so the shared prefix can be stripped before
    // length-aware or numeric comparisons. Defaults to lexicographic order.
    // sortFiles: (files, { pluginDir }) => [...files].sort((a, b) => a.localeCompare(b)),
  }),
  context: createUmzeptionPgContext(new pg.Pool({
    allowExitOnIdle: true,
    connectionString: '...',
  })),
  storage: new UmzeptionPgStorage(),
  logger: console,
});

await umzug.up();
```

## Concept

### First install

On the first install in an environment you set `install: true` in `umzeption()`. This makes it so that the `installSchema()` methods will be what is run and all migrations will be marked as being run without actually running (as a fresh install should need no migrations).

### Subsequent upgrades

On everything but the first install you set `install: false` in `umzeption()` (or leave it out). This makes it so that the `installSchema()` methods not be run, but all new migrations will be run as normal through Umzug.

## How to make an Umzeption dependency

The dependency is expected to provide one of these two at its top level

### Through `umzeptionConfig` property

Makes it easy to enforce types and keeps all Umzeption related stuff grouped together

```javascript
/** @satisfies {import('umzeption').UmzeptionDependency} */
export const umzeptionConfig = {
  dependencies: ['@yikesable/abc'],
  glob: ['migrations/*.js'],
  // Optional: a dependency can declare its own sort if its filenames need
  // special ordering (e.g. legacy non-timestamp names). Wins over the
  // top-level `sortFiles` for this dependency only.
  // sortFiles: (files, { pluginDir }) => [...files].sort(),
  async installSchema ({ context }) {
    if (context.type !== 'pg') {
      throw new Error(`Unsupported context type: ${context.type}`);
    }

    const tables = await getTables();

    await context.value.transact(async client => {
      for (const table of tables) {
        await client.query(table);
      }
    });
  },
};
```

### Through top level exports

Alternative to `umzeptionConfig` when you prefer named exports over a config object. Each export must be typed individually (vs `umzeptionConfig`'s single `@satisfies UmzeptionDependency` annotation), as the example below shows on its `installSchema` typedef.

```javascript
export const dependencies = ['@yikesable/abc'];
export const glob = ['migrations/*.js'];
/** @type {import('umzeption').UmzeptionDependency["installSchema"]} */
export async function installSchema ({ context }) {
  if (context.type !== 'pg') {
    throw new Error(`Unsupported context type: ${context.type}`);
  }

  const tables = await getTables();

  await context.value.transact(async client => {
    for (const table of tables) {
      await client.query(table);
    }
  });
}
```

### Using `installSchemaFromString` helper

Use this helper when your schema is a string of `CREATE` statements (e.g. loaded from a `.sql` file); non-`CREATE` DDL (`ALTER TABLE`, `DO $$`, etc.) must use `context.value.transact` directly.

```javascript
import { readFile } from 'node:fs/promises';

import { installSchemaFromString } from 'umzeption';

/** @satisfies {import('umzeption').UmzeptionDependency} */
export const umzeptionConfig = {
  dependencies: ['@yikesable/abc'],
  glob: ['migrations/*.js'],
  installSchema: async ({ context }) => {
    const tables = await readFile(new URL('create-tables.sql', import.meta.url), 'utf8');
    return installSchemaFromString(context, tables);
  },
};
```

## Using the CLI

Umzug ships a CLI with `create`, `up`, `down`, and `pending` subcommands. Umzeption layers an `install` subcommand on top — it runs each dependency's `installSchema()` and marks all existing migrations as already-executed (the "fresh database" mode). The `create` subcommand auto-generates timestamp-prefixed migration filenames and runs an `allowConfusingOrdering` safety check that errors if a new file would sort before existing migrations (see [Notes on `sortFiles` ordering](#notes-on-sortfiles-ordering)).

Use `createUmzeption` to wire it up in one step — see the [Usage](#usage) section above.

Then run:

```bash
node tools/umzug.js install                          # fresh database: runs installSchema() for every dependency
node tools/umzug.js create --name my-migration.js    # folder defaults to the location of tools/umzug.js
node tools/umzug.js pending                          # lists pending migrations
node tools/umzug.js up                               # applies all pending migrations
```

On a fresh project with no migrations yet, `create` auto-infers its destination folder from the location of your `tools/umzug.js` (via `meta: import.meta`); pass `--folder path/to/migrations` to override. Without this default, umzug would error with "Couldn't infer a directory to generate migration file in" on the very first `create`.

When generating migrations manually, use filenames that match umzug's own `create` output format: `YYYY.MM.DDTHH.MM.SS.name.js` — dots throughout, e.g. `2026.05.19T14.23.45.my-migration.js`. Umzeption sorts migration files lexicographically, so hand-authored names must sort consistently with anything produced by `umzug create`.

## Notes on `sortFiles` ordering

Umzug's `create` CLI command runs an `allowConfusingOrdering` safety check that assumes **lexicographic** ordering of migration filenames — it errors if the new file would sort before existing ones. If you override `sortFiles` with a non-lexicographic comparator, that check's verdict may not match your actual execution order. Either keep `sortFiles` lexicographic (just permuting equal-priority groups) or run `umzug create --allow-confusing-ordering` and verify ordering yourself.

**Upgrading from a pre-sort version (umzeption ≤ 0.4.x):** earlier releases returned migration files in whatever order globby provided — typically close to lexicographic on Linux/macOS but never guaranteed. The new default lexicographic sort can therefore reorder *pending* migrations on upgrade (already-applied migrations are unaffected; Umzug skips them by name regardless of candidate-list order). The narrow failure shape is unpadded numeric filenames: `1.js, 2.js, 10.js` now sort as `1, 10, 2`, so migration `10` would run before `2`. If you have pending migrations matching that pattern, either rename to zero-padded (`01.js, 02.js, 10.js`) or timestamp-prefixed names, or pass `sortFiles: files => files` to opt out and preserve the prior filesystem-order behavior.

## See also

* [`umzug`](https://github.com/sequelize/umzug) – the base system this module is meant to be paired with
* [`plugin-importer`](https://github.com/voxpelli/plugin-importer) – the plugin loader that this module uses
