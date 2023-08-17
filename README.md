# Umzeption

A recursive [Umzug](https://github.com/sequelize/umzug) extension with migration-less installs

[![npm version](https://img.shields.io/npm/v/umzeption.svg?style=flat)](https://www.npmjs.com/package/umzeption)
[![npm downloads](https://img.shields.io/npm/dm/umzeption.svg?style=flat)](https://www.npmjs.com/package/umzeption)
[![js-semistandard-style](https://img.shields.io/badge/code%20style-semistandard-brightgreen.svg)](https://github.com/voxpelli/eslint-config)
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

## See also

* [`umzug`](https://github.com/sequelize/umzug) – the base system this module is meant to be paired with
* [`plugin-importer`](https://github.com/voxpelli/plugin-importer) – the plugin loader that this module uses
