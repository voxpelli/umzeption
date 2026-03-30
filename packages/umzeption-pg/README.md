# umzeption-pg

PostgreSQL adapter for [umzeption](https://www.npmjs.com/package/umzeption)

[![npm version](https://img.shields.io/npm/v/umzeption-pg.svg?style=flat)](https://www.npmjs.com/package/umzeption-pg)
[![npm downloads](https://img.shields.io/npm/dm/umzeption-pg.svg?style=flat)](https://www.npmjs.com/package/umzeption-pg)
[![neostandard javascript style](https://img.shields.io/badge/code_style-neostandard-7fffff?style=flat&labelColor=ff80ff)](https://github.com/neostandard/neostandard)
[![Module type: ESM](https://img.shields.io/badge/module%20type-esm-brightgreen)](https://github.com/voxpelli/badges-cjs-esm)
[![Types in JS](https://img.shields.io/badge/types_in_js-yes-brightgreen)](https://github.com/voxpelli/types-in-js)

## Install

```sh
npm install umzeption umzeption-pg umzug pg
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
    dependencies: ['@yikesable/foo'],
    glob: ['migrations/*.js'],
    meta: import.meta,
    install: false,
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

## API

### `createUmzeptionPgContext(pool)`

Creates an umzeption context wrapping a `pg.Pool`. The context has `type: 'pg'` and exposes:

- `context.value.query(sql, ...values)` — runs a query on the pool
- `context.value.transact(fn)` — runs `fn` in a transaction (BEGIN/COMMIT/ROLLBACK)

### `UmzeptionPgStorage`

An `UmzugStorage` implementation that stores migration state in a PostgreSQL table (`umzeption_migrations` by default, configurable via the `tableName` option) using the pg context connection. Automatically creates the table if it does not exist.

### `pgInstallSchemaFromString(context, sql)`

Splits a SQL string on `;` boundaries and executes each statement inside a transaction. Handles multi-line whitespace and SQL comments between statements.

> **Note:** Importing from `umzeption-pg` automatically registers the pg schema installer for `installSchemaFromString`. You do not need to call `registerSchemaInstaller` yourself.

### Types

Importing `umzeption-pg` augments the `umzeption` module's `DefineUmzeptionContexts` interface via TypeScript module augmentation, making the `pg` context type available throughout your project:

```typescript
// Automatically applied when you import from 'umzeption-pg':
declare module 'umzeption' {
  interface DefineUmzeptionContexts {
    pg: UmzeptionContext<'pg', FastifyPostgresStyleDb>
  }
}
```

#### `FastifyPostgresStyleDb`

The shape of `context.value` for the `pg` context:

```typescript
interface FastifyPostgresStyleDb {
  query(sql: string, ...values: string[]): Promise<{ rows: Array<{ [column: string]: unknown }> }>
  transact(fn: (client: FastifyPostgresStyleDb) => Promise<void>): Promise<void>
}
```

## See also

* [`umzeption`](https://www.npmjs.com/package/umzeption) – core package
* [`umzug`](https://github.com/sequelize/umzug) – the base migration system
* [`pg`](https://github.com/brianc/node-postgres) – PostgreSQL client for Node.js
