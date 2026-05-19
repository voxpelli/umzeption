# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Umzeption** is a recursive extension for [Umzug](https://github.com/sequelize/umzug) that turns DB migrations into a **transitive dependency graph across npm packages**: every package can ship its own migrations and an `installSchema()`, and umzeption discovers them via [`plugin-importer`](https://github.com/voxpelli/plugin-importer), groups them per package (dependencies first, host app last), and hands the combined list to Umzug. This is the design's whole reason to exist — most other Node migration tools (`postgrator`, `node-pg-migrate`, Knex's migrations) operate on a single flat folder.

Two operating modes drive the rest of the design:
- **install**: fresh database. For each dependency, run `installSchema()` (typically full DDL), then mark every existing migration as already executed without running it.
- **upgrade**: existing database. Run only the migrations Umzug has not yet recorded in `umzeption_migrations`.

`UmzeptionContext` + `UmzeptionStorage` are the extension points: the bundled `lib/context-pg/` is a Postgres implementation, but the core does not assume Postgres. Treat `context-pg` as a first-party plugin, not the core — when adding features, default to the generic layer unless the feature is intrinsically pg-specific.

## Code map

- `lib/main.js` — public entry, adapts `umzeptionLookup` for Umzug's migration provider.
- `lib/lookup.js` — orchestrates dependency load + migration resolve + install-stub construction.
- `lib/dependencies.js` — loads dependencies via `plugin-importer`; accepts either an `umzeptionConfig` export or top-level exports.
- `lib/resolve-migrations.js` — globs migration files per dependency, validates up/down, wraps as `RunnableMigration`. globby returns filesystem order; `sortMigrationFiles` applies a lexicographic sort for determinism (overridable via the top-level or per-dep `sortFiles` option). Hand-authored filenames must therefore sort consistently with `umzug create`'s `YYYY.MM.DDTHH.MM.SS.name.js` output format.
- `lib/storage.js` — `BaseUmzeptionStorage`, abstract `UmzugStorage` impl managing the `umzeption_migrations` table; subclasses provide `query()`.
- `lib/context.js`, `lib/definition.js` — context factory + definition validator.
- `lib/context-pg/` — pg-specific context (`createUmzeptionPgContext`), storage (`UmzeptionPgStorage`), and a `FastifyPostgresStyleDb` adapter with transaction support.
- `lib/schema-helper.js` — `installSchemaFromString` / `pgInstallSchemaFromString`. **Gotcha:** splits on statement boundaries between `CREATE` statements only — non-`CREATE` DDL (`ALTER TABLE`, `DO $$`, etc.) must go through `context.value.transact(client => client.query(sql))` directly.
- `lib/advanced-types.d.ts` — hand-written type declarations; do not delete on a "no .ts source" sweep.

## Type system

This project is **JavaScript with JSDoc**, type-checked by `tsc` but never compiled. There are no `.ts` source files. The declaration build (`npm run build`) only emits `.d.ts` from JSDoc + the hand-written `lib/advanced-types.d.ts`. Do not convert source files to TypeScript.

`type-coverage` enforces ≥99% strict coverage (test files excluded). Prefer `unknown` + type guards over `any`.

`index.d.ts` is hand-maintained — mirror every `index.js` export there or `tsc` will fail. Fields added to `UmzeptionDependency` flow into `UmzeptionDefinition` and `UmzeptionLookupOptions` via `extends` + `PartialKeys` — one declaration covers all three consumers.

## Commands

```bash
npm test                    # full validation: check + test:node (what CI runs)
npm run check               # all checks in parallel: lint, tsc, type-coverage, knip, installed-check
npm run test:node           # tests only, with c8 coverage
npm run build               # generate .d.ts files

# single test
node --test test/integration.spec.js
node --test --test-name-pattern 'should resolve' test/integration.spec.js
```

Tests live in `test/*.spec.js`, use Node's built-in `node:test`, and use `sinon` for stubbing. Postgres integration tests stub `pg.Pool.prototype.query` — **no real database is required**. Fixtures (including miniature dependency packages) live in `test/fixtures/`.

Pre-push runs `npm test`; commit-msg enforces conventional commits via husky. Releases are automated through release-please from conventional-commit history; in 0.x semver, `!:` lands as a minor bump, not major.

If `npm test` fails on `installed-check`, the failure surface is wider than the message suggests — it checks engine, peer-dep, and version ranges (any one `-i` flag disables the others). Start with `npm install` to sync; persistent failures usually mean `engines.node` is too loose for the combined dep tree.

## Conventions

- ESM only (`"type": "module"`, Node ≥20.0.0).
- Style: `neostandard` via `@voxpelli/eslint-config`.
- When adding migration discovery features, preserve the dot-separated ISO timestamp-prefix convention (`YYYY.MM.DDTHH.MM.SS.name.js`, matching `umzug create`) and the lexicographic default sort — consumers rely on filename ordering being authoritative and on the per-dep `sortFiles` precedence rule defined in `lib/lookup.js`.
- When extending storage or context, mirror the `BaseUmzeptionStorage` / `UmzeptionContext` shape so non-pg backends remain possible.
- Test fixtures (`test/fixtures/<name>/`): `index.js` exports either `umzeptionConfig` (preferred, `@satisfies UmzeptionDependency`) or top-level `glob` + `installSchema` (legacy, both supported); migrations are sinon stubs exporting `up`/`down`.
- In `assert.rejects` callbacks, type `err` as `/** @type {any} */` — tsc otherwise treats it as `unknown`.
