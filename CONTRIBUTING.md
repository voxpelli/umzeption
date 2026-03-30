# Contributing to umzeption

## Monorepo structure

This repository is an npm workspaces monorepo containing:

- **`packages/umzeption`** — core package providing dependency-aware migrations
- **`packages/umzeption-pg`** — PostgreSQL adapter (extends core via module augmentation)

## Development setup

```sh
# Install all dependencies (root + workspaces)
npm install

# Build type declarations for all packages
npm run build

# Run full check suite (type-check, lint, knip, type-coverage)
npm run check

# Run tests
npm test
```

### Working on a specific package

```sh
cd packages/umzeption
npm test

cd packages/umzeption-pg
npm test
```

## Code style

- Source files are **plain JavaScript** (`.js`) with **JSDoc type annotations** — TypeScript is used only for type-checking and `.d.ts` declaration generation. Do not use `.ts` source files.
- Module format: **ESM** (`"type": "module"` in `package.json`). Use `import`/`export`, not `require`.
- Type declarations (`.d.ts`) are hand-authored for the public API surface; internal types use JSDoc annotations in `.js` files.
- Linting is via `eslint` with `@voxpelli/eslint-config`. Run `npm run check:lint` to check.

## Testing

Tests use the **Node.js built-in test runner** (`node --test`). No external test framework.

```sh
# Run tests with coverage
npm run test:node
```

Integration tests for `umzeption-pg` require a running PostgreSQL instance. They are skipped automatically when the `PG_*` environment variables are not set.

## How migration resolution works

1. `umzeptionLookup` loads dependency definitions via `loadDependencies` (using `plugin-importer`)
2. Each dependency provides `glob` (file patterns), `installSchema` (schema setup function), and optionally `uninstallSchema` (schema teardown)
3. Install migrations are synthetic entries prepended to the migration list — their `up` calls `installSchema`, their `down` calls `uninstallSchema` (if provided)
4. File migrations are resolved via `resolveMigrations`, which globs for files and imports each as an ESM module exporting `{ up, down }`
5. Files are sorted alphabetically for deterministic ordering across platforms

## How plugin-importer / dependency loading works

`loadDependencies` uses `plugin-importer`'s `resolvePluginsInOrder` to:
1. Resolve each named dependency as an npm package
2. Topologically sort them respecting `dependencies` declared within each definition
3. Validate each definition with `ensureUmzeptionDefinition`

## How context extensibility works (module augmentation)

The core `DefineUmzeptionContexts` interface in `packages/umzeption/lib/advanced-types.d.ts` is designed for extension. Adapter packages use TypeScript module augmentation:

```ts
// packages/umzeption-pg/lib/types.d.ts
declare module 'umzeption' {
  interface DefineUmzeptionContexts {
    pg: UmzeptionContext<'pg', FastifyPostgresStyleDb>
  }
}
```

Simply importing from `umzeption-pg` in your project activates the augmented types.

## How `installSchemaFromString` works (plugin registry)

The core `installSchemaFromString` function uses a runtime plugin registry (`Map`). Adapter packages register their handler at module load time:

```js
// packages/umzeption-pg/lib/schema-helper.js
registerSchemaInstaller('pg', async (context, sql) => { ... });
```

Calling `installSchemaFromString` without importing the appropriate adapter will throw with a clear error listing the unsupported context type.

## Husky git hooks

```sh
# Enable hooks (run once after clone)
npm run husky-enable

# Disable hooks
npm run husky-disable
```

## Release process

This repository uses [Release Please](https://github.com/googleapis/release-please) with conventional commits. Packages are released independently from `packages/umzeption` and `packages/umzeption-pg`.

Commit message format: `type(scope): description` — e.g. `feat(umzeption): add uninstallSchema support`.
