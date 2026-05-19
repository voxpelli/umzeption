# Umzeption

A recursive [Umzug](https://github.com/sequelize/umzug) extension with migration-less installs

[![npm version](https://img.shields.io/npm/v/umzeption.svg?style=flat)](https://www.npmjs.com/package/umzeption)
[![npm downloads](https://img.shields.io/npm/dm/umzeption.svg?style=flat)](https://www.npmjs.com/package/umzeption)
[![neostandard javascript style](https://img.shields.io/badge/code_style-neostandard-7fffff?style=flat&labelColor=ff80ff)](https://github.com/neostandard/neostandard)
[![Module type: ESM](https://img.shields.io/badge/module%20type-esm-brightgreen)](https://github.com/voxpelli/badges-cjs-esm)
[![Types in JS](https://img.shields.io/badge/types_in_js-yes-brightgreen)](https://github.com/voxpelli/types-in-js)
[![Follow @voxpelli@mastodon.social](https://img.shields.io/mastodon/follow/109247025527949675?domain=https%3A%2F%2Fmastodon.social&style=social)](https://mastodon.social/@voxpelli)

## Usage

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
    // Optional: Which migrations do we have ourselves?
    async installSchema ({ context: queryInterface }) {},
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
  // Other contexts can be created and plugins can support multiple contexts
  context: createUmzeptionPgContext(new pg.Pool({
    allowExitOnIdle: true,
    connectionString: '...',
  })),
  // Any type of storage can be used, but UmzeptionStorage  ones re-use the context's connection + ensures a match with the context types
  storage: new UmzeptionPgStorage(),
  logger: console,
});

umzug.up();
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
  },
};
```

### Using `installSchemaFromString` helper

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

Umzug ships a CLI with `create`, `up`, `down`, and `pending` subcommands. The `create` subcommand auto-generates timestamp-prefixed migration filenames and runs the `allowConfusingOrdering` safety check (warns if a new file would sort before existing migrations).

Use `createUmzeptionUmzug` to wire it up in one step:

```javascript
// tools/umzug.js
import pg from 'pg';
import {
  UmzeptionPgStorage,
  createUmzeptionPgContext,
  createUmzeptionUmzug,
} from 'umzeption';

const context = createUmzeptionPgContext(new pg.Pool({
  allowExitOnIdle: true,
  connectionString: process.env.DATABASE_URL,
}));

const umzug = createUmzeptionUmzug({
  umzeption: {
    dependencies: ['@yikesable/foo'],
    glob: ['migrations/*.js'],
    meta: import.meta,
  },
  context,
  storage: new UmzeptionPgStorage(),
  logger: console,
});

umzug.runAsCLI();
```

Then run:

```bash
node tools/umzug.js create --name my-migration.js   # creates a timestamp-prefixed file
node tools/umzug.js pending                          # lists pending migrations
node tools/umzug.js up                               # applies all pending migrations
```

Use timestamp-prefixed filenames (`YYYYMMDDHHMMSS-name.js`) when generating new migrations manually — umzeption sorts migration files lexicographically, matching umzug's own `create` output.

## Note on custom `sortFiles` and `umzug create`

Umzug's `create` CLI command runs an `allowConfusingOrdering` safety check that assumes **lexicographic** ordering of migration filenames — it errors if the new file would sort before existing ones. If you override `sortFiles` with a non-lexicographic comparator, that check's verdict may not match your actual execution order. Either keep `sortFiles` lexicographic (just permuting equal-priority groups) or run `umzug create --allow-confusing-ordering` and verify ordering yourself.

## See also

* [`umzug`](https://github.com/sequelize/umzug) – the base system this module is meant to be paired with
* [`plugin-importer`](https://github.com/voxpelli/plugin-importer) – the plugin loader that this module uses
