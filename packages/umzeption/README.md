# Umzeption

A recursive [Umzug](https://github.com/sequelize/umzug) extension with migration-less installs

[![npm version](https://img.shields.io/npm/v/umzeption.svg?style=flat)](https://www.npmjs.com/package/umzeption)
[![npm downloads](https://img.shields.io/npm/dm/umzeption.svg?style=flat)](https://www.npmjs.com/package/umzeption)
[![neostandard javascript style](https://img.shields.io/badge/code_style-neostandard-7fffff?style=flat&labelColor=ff80ff)](https://github.com/neostandard/neostandard)
[![Module type: ESM](https://img.shields.io/badge/module%20type-esm-brightgreen)](https://github.com/voxpelli/badges-cjs-esm)
[![Types in JS](https://img.shields.io/badge/types_in_js-yes-brightgreen)](https://github.com/voxpelli/types-in-js)
[![Follow @voxpelli@mastodon.social](https://img.shields.io/mastodon/follow/109247025527949675?domain=https%3A%2F%2Fmastodon.social&style=social)](https://mastodon.social/@voxpelli)

## Overview

Umzeption adds two things on top of [Umzug](https://github.com/sequelize/umzug):

1. **Dependency-aware migration loading** — recursively resolve and topologically sort migrations from npm packages that declare `umzeptionConfig`
2. **Install vs upgrade mode** — on first install run `installSchema()` (idempotent SQL) and skip file migrations; on upgrades run file migrations normally

### Architecture

```
umzeption({ install, dependencies, glob, installSchema })
    │
    ├─ loadDependencies()          ← resolves npm packages via plugin-importer
    │   └─ topological sort        ← respects inter-dependency declarations
    │
    ├─ [for each dependency + main]
    │   ├─ synthetic install migration
    │   │   up:   installSchema()  ← schema setup (install mode only)
    │   │   down: uninstallSchema() ← schema teardown (if provided)
    │   └─ resolveMigrations()     ← globs files, sorts alphabetically
    │       up/down: module exports
    │
    └─ returns RunnableMigration[] for Umzug
```

**Install mode** (`install: true`): `installSchema` runs; file migrations are marked done without running.

**Upgrade mode** (`install: false`): `installSchema` is skipped; new file migrations run normally via Umzug.

## Install

```sh
npm install umzeption umzug
# For PostgreSQL support:
npm install umzeption-pg pg
```

## Usage

```javascript
import pg from 'pg';
import { umzeption } from 'umzeption';
import {
  UmzeptionPgStorage,
  createUmzeptionPgContext,
} from 'umzeption-pg';
import { Umzug } from 'umzug';

const umzug = new Umzug({
  migrations: umzeption({
    // Which dependencies to load migrations and schemas from
    dependencies: [
      '@yikesable/foo',
      '@yikesable/bar',
    ],
    // Optional: your own migrations
    glob: ['migrations/*.js'],
    // Optional: your own schema setup (runs in install mode)
    async installSchema ({ context }) {
      await context.value.transact(async client => {
        await client.query('CREATE TABLE IF NOT EXISTS my_table (id serial PRIMARY KEY)');
      });
    },
    // Optional: set true for first install; false (default) for upgrades
    install: false,
    // Optional: resolve paths relative to this file
    meta: import.meta,
  }),
  context: createUmzeptionPgContext(new pg.Pool({
    allowExitOnIdle: true,
    connectionString: process.env.DATABASE_URL,
  })),
  storage: new UmzeptionPgStorage(),
  logger: console,
});

await umzug.up();
```

## Concept

### First install

Set `install: true`. The `installSchema()` of each dependency (and your own) runs once to set up the full schema. All file migrations are recorded as already applied — they are not run, because the schema is already up to date.

### Subsequent upgrades

Set `install: false` (or omit). `installSchema()` is skipped. Umzug runs any new file migrations that have not been applied yet.

### Dependency ordering

Dependencies are resolved recursively from npm packages and sorted topologically. If `@yikesable/foo` declares `dependencies: ['@yikesable/base']`, `base` will be installed and migrated first automatically.

## Making an Umzeption dependency

### Via `umzeptionConfig` export (recommended)

```javascript
/** @satisfies {import('umzeption').UmzeptionDependency} */
export const umzeptionConfig = {
  // Other umzeption packages this one depends on
  dependencies: ['@yikesable/abc'],
  // Migration files to run on upgrade
  glob: ['migrations/*.js'],
  // Full schema setup for fresh install
  async installSchema ({ context }) {
    if (context.type !== 'pg') {
      throw new Error(`Unsupported context type: ${context.type}`);
    }
    await context.value.transact(async client => {
      await client.query(`
        CREATE TABLE my_table (id serial PRIMARY KEY, name text NOT NULL)
      `);
    });
  },
  // Optional: tear down schema (used as "down" for the install migration)
  async uninstallSchema ({ context }) {
    if (context.type !== 'pg') return;
    await context.value.query('DROP TABLE IF EXISTS my_table');
  },
};
```

### Via top-level exports

```javascript
export const dependencies = ['@yikesable/abc'];
export const glob = ['migrations/*.js'];

/** @type {import('umzeption').UmzeptionDependency["installSchema"]} */
export async function installSchema ({ context }) {
  // ...
}
```

### Using `installSchemaFromString` with a SQL file

```javascript
import { readFile } from 'node:fs/promises';
import { installSchemaFromString } from 'umzeption';

/** @satisfies {import('umzeption').UmzeptionDependency} */
export const umzeptionConfig = {
  glob: ['migrations/*.js'],
  installSchema: async ({ context }) => {
    const sql = await readFile(new URL('schema.sql', import.meta.url), 'utf8');
    return installSchemaFromString(context, sql);
  },
};
```

> **Note:** `installSchemaFromString` requires an adapter package (e.g. `umzeption-pg`) to be imported so that a schema installer is registered for the context type. Calling it without an adapter throws.

### Migration file format

Each file in `glob` must export `up` and `down` functions:

```javascript
/** @type {import('umzug').MigrationFn<import('umzeption').AnyUmzeptionContext>} */
export async function up ({ context }) {
  await context.value.query('ALTER TABLE my_table ADD COLUMN email text');
}

/** @type {import('umzug').MigrationFn<import('umzeption').AnyUmzeptionContext>} */
export async function down ({ context }) {
  await context.value.query('ALTER TABLE my_table DROP COLUMN email');
}
```

## API

### `umzeption(options)`

Returns a [migrations resolver](https://github.com/sequelize/umzug#custom-resolver) for use with `new Umzug({ migrations: ... })`.

| Option | Type | Description |
|---|---|---|
| `dependencies` | `string[]` | npm package names to load as umzeption dependencies |
| `glob` | `string[]` | Glob patterns for your own migration files (relative to `cwd`/`meta`) |
| `installSchema` | `MigrationFn` | Schema setup function, called only in install mode |
| `uninstallSchema` | `MigrationFn` | Optional schema teardown, used as `down` for the install migration |
| `install` | `boolean` | `true` = install mode, `false` = upgrade mode (default: `false`) |
| `meta` | `ImportMeta` | Used to resolve `glob` paths relative to the calling file |
| `cwd` | `string` | Alternative to `meta`; defaults to `process.cwd()` |
| `noop` | `boolean` | If `true`, all migrations are no-ops (useful for testing) |

### `installSchemaFromString(context, sql)`

Runs a SQL string through the registered adapter for the given context type. Requires the appropriate adapter package to have been imported.

### `registerSchemaInstaller(contextType, installer)`

Registers a schema installer for a context type. Called automatically by adapter packages on import.

## See also

* [`umzeption-pg`](https://www.npmjs.com/package/umzeption-pg) – PostgreSQL adapter for umzeption
* [`umzug`](https://github.com/sequelize/umzug) – the base migration system this module extends
* [`plugin-importer`](https://github.com/voxpelli/plugin-importer) – the plugin loader used for dependency resolution
