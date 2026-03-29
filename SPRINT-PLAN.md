# Umzeption: 40-Sprint Improvement Plan

## Context

**umzeption** (v0.4.1) is a recursive Umzug extension providing dependency-aware database migrations with an install/upgrade dual mode. It has been dormant ~16 months with significant dependency debt (9 unmerged Renovate PRs, production deps 1-3 major versions behind). Node 18 has reached EOL. The project needs alignment with `voxpelli/node-module-template` (the gold-standard template for voxpelli's modules) and has an explicit TODO to extract PostgreSQL support into a separate package.

**Goal:** Modernize, align with template, improve code quality, extract pg support into a monorepo, and prepare for v1.0.0.

---

## Phase 1: Foundation & Debt (Sprints 1-8)

### Sprint 1: Drop Node 18, Bump Engine Range
- `package.json`: `engines.node` from `>=18.6.0` to `^20.19.0 || ^22.13.0 || >=24`
- `.github/workflows/nodejs.yml`: `node-versions` from `18,20,22,23` to `20,22,24`

### Sprint 2: Update tsconfig Base to node20
- `package.json`: `@voxpelli/tsconfig` ^15 to ^16, `@types/node` ^18 to ^20
- `tsconfig.json`: extends `node18.json` to `node20.json`

### Sprint 3: Update @voxpelli/typed-utils v1 to v4
- `package.json`: `@voxpelli/typed-utils` ^1.1.0 to ^4.x
- `lib/definition.js`: audit `isStringArray` usage for API changes

### Sprint 4: Update @voxpelli/type-helpers v3 to v4
- `package.json`: `@voxpelli/type-helpers` ^3.4.0 to ^4.x
- `lib/advanced-types.d.ts`: verify `AnyDeclaration`, `ValidDeclaration`, `PartialKeys` imports

### Sprint 5: Update globby v14 to v16
- `package.json`: `globby` ^14.0.1 to ^16.x
- `lib/resolve-migrations.js`: verify `globby({ cwd, absolute: true })` compatibility

### Sprint 6: Update plugin-importer v0.1 to v0.2
- `package.json`: `plugin-importer` ^0.1.1 to ^0.2.x
- `lib/definition.js`, `lib/dependencies.js`: audit `assertToBePluginDefinition`, `loadPlugins`, `resolvePluginsInOrder`, `getExtensionlessBasename`

### Sprint 7: Update Dev Toolchain (eslint-config, installed-check, npm-run-all2)
- `package.json`: `@voxpelli/eslint-config` ^22 to ^23, `installed-check` ^9 to ^10, `npm-run-all2` ^7 to ^8
- `eslint.config.js`: adjust for eslint-config v23 API if needed

### Sprint 8: Update Remaining Dev Deps (c8, TypeScript, eslint, knip, sinon)
- `package.json`: `c8` ^10 to ^11, `typescript` ~5.7 to ~5.9, update `eslint`, `knip`, `sinon`
- Add `engines.typescript: ">=5.8"` per template convention
- `.github/workflows/ts-internal.yml`: update ts-versions

---

## Phase 2: Quality & Tooling (Sprints 9-16)

### Sprint 9: Align check/lint Scripts with Template
- `scripts.check`: add `--continue-on-error` flag
- `scripts.check:lint`: simplify from `eslint --report-unused-disable-directives .` to `eslint`
- `scripts.check:installed-check`: review ignore list

### Sprint 10: Align clean Scripts with Template
- `scripts.clean:declarations-top`: `rm -rf` to `rm -f`
- `scripts.clean:declarations-lib`: add `2>/dev/null || true` error suppression

### Sprint 11: Align Husky Configuration with Template
- Replace `prepare: "husky"` with `husky-enable`/`husky-disable` scripts
- Remove `.husky/` directory (template dropped it)
- Evaluate keeping `validate-conventional-commit` (template dropped it)

### Sprint 12: Simplify files Array and eslint.config.js
- `files` array: remove leading `/`, use `lib/**/*.js` recursive globs
- `eslint.config.js`: use direct `export default voxpelli({...})` style if v23 supports it

### Sprint 13: Add tstyche Type Contract Tests
- Add `tstyche` devDep, create `tstyche.config.json` with `rejectAnyType: true`, `rejectNeverType: true`
- Create `typetests/` directory with initial type tests for public API
- `tsconfig.json`: add `exclude: ["typetests/**/*"]`, `compilerOptions.types: ["node"]`
- `.knip.jsonc`: add `typetests/**/*.tst.ts` entry
- `package.json`: add `check-type-tests` script

### Sprint 14: Add dependency-review.yml Workflow
- New `.github/workflows/dependency-review.yml` using `voxpelli/ghatemplates/.github/workflows/dependency-review.yml@main`

### Sprint 15: Add tstyche CI Workflow
- New `.github/workflows/tstyche.yml` using `voxpelli/ghatemplates/.github/workflows/tstyche.yml@main`
- Scheduled Mon/Wed/Fri at 5:14 UTC, TS targets >=5.8 and next

### Sprint 16: Expand Type Contract Tests for Full Public API
- Type tests for: `UmzeptionContext`, `UmzeptionDependency`, `AnyUmzeptionContext`, `DefineUmzeptionContexts`, `FastifyPostgresStyleDb`, `BaseUmzeptionStorage`, `UmzeptionPgStorage`, `createUmzeptionContext`, `createUmzeptionPgContext`, `umzeption`, `installSchemaFromString`, `pgInstallSchemaFromString`

---

## Phase 3: Code Health (Sprints 17-24)

### Sprint 17: Sort Migration Files for Deterministic Ordering
- `lib/resolve-migrations.js`: add `.sort()` after `globby()` call
- Add test verifying consistent ordering across platforms

### Sprint 18: Remove Unused _context Parameter
- `lib/resolve-migrations.js`: remove `_context` parameter from function signature
- `lib/lookup.js`: update call sites

### Sprint 19: Clean Up Commented-Out Code in definition.js
- `lib/definition.js` lines 59-81: remove commented-out `assertToBeUmzeptionDefinition` and `isUmzeptionDefinition`
- If desired as future API, create a GitHub issue instead

### Sprint 20: Improve SQL Splitting in schema-helper.js
- `lib/schema-helper.js`: improve `getTablesFromString` regex to handle edge cases (multi-line comments, string literals with semicolons, CREATE INDEX/TYPE/FUNCTION)
- Document known limitations

### Sprint 21: Add Unit Tests for schema-helper.js
- New `test/schema-helper.spec.js`: tests for single table, multiple tables, tables with comments, trailing semicolons, edge cases

### Sprint 22: Add Unit Tests for context-pg/utils.js
- New `test/pg-utils.spec.js`: test `createFastifyPostgresStyleDb`, `transact` (BEGIN/COMMIT/ROLLBACK/release)

### Sprint 23: Add Unit Tests for storage.js
- New `test/storage.spec.js`: test `BaseUmzeptionStorage` ensureTable caching, logMigration, unlogMigration, executed

### Sprint 24: Convert TODO Comments to GitHub Issues
- Replace the 3 "Extract pg context" TODOs (`index.js:1`, `lib/context-pg/context.js:4`, `lib/advanced-types.d.ts:71`) with issue references
- Run type-coverage, fix any gaps to maintain 99%

---

## Phase 4: Architecture (Sprints 25-32)

### Sprint 25: Initialize npm Workspaces Monorepo Structure
- Root `package.json`: add `"private": true, "workspaces": ["packages/*"]`
- Move existing source into `packages/umzeption/`
- Preserve git history

### Sprint 26: Create umzeption-pg Package Scaffold
- New `packages/umzeption-pg/package.json`: `pg` as regular dep (connect-pg-simple precedent), `umzeption` + `umzug` as peer deps
- New `packages/umzeption-pg/tsconfig.json`, `index.js`, `index.d.ts`
- Follow node-module-template structure

### Sprint 27: Extract PG Context Code
- Move `lib/context-pg/` contents to `packages/umzeption-pg/lib/`
- Remove PG-specific types from core `advanced-types.d.ts` (`FastifyPostgresStyleDb`, pg context entry)
- Remove PG re-exports from core `index.js` and `index.d.ts`

### Sprint 28: Extract PG Schema Helper
- Move `pgInstallSchemaFromString` to `packages/umzeption-pg/lib/schema-helper.js`
- Refactor core `installSchemaFromString` to use extensible pattern (registry/callback) instead of hardcoded switch on context type

### Sprint 29: Implement Module Augmentation for Type Extensibility
- Core `advanced-types.d.ts`: base `DefineUmzeptionContexts` with only `unknown`
- `packages/umzeption-pg/lib/types.d.ts`: `declare module 'umzeption'` to add `pg` context type
- Standard TypeScript pattern (Express/Fastify precedent)

### Sprint 30: Move PG Tests to umzeption-pg Package
- Move `test/pg-integration.spec.js` to `packages/umzeption-pg/test/`
- Move `test/pg-utils.spec.js` (from Sprint 22)
- Independent test scripts per package, workspace-level `npm test`

### Sprint 31: Update CI for Monorepo
- Update all workflows (`nodejs.yml`, `lint.yml`, `ts-internal.yml`, `tstyche.yml`)
- Update `release-please` config: add `packages/umzeption-pg` to packages map
- Workspace-level scripts

### Sprint 32: Prepare Major Version Bump (v1.0.0)
- Write migration guide for v0.x to v1.x
- Update CHANGELOG, README for both packages
- Document new `import { ... } from 'umzeption-pg'` paths
- Bump version to v1.0.0

---

## Phase 5: Features & Polish (Sprints 33-40)

### Sprint 33: Replace globby with Built-in fs.glob
- `packages/umzeption/lib/resolve-migrations.js`: use `fs.glob` (Node 22+) or conditional fallback for Node 20
- Remove `globby` production dependency if fully replaced

### Sprint 34: Add Down Migrations for Install Steps
- `advanced-types.d.ts`: add optional `uninstallSchema` to `UmzeptionDependency`
- `lib/lookup.js`: wire `uninstallSchema` as `down` method on install migrations
- `lib/definition.js`: validate `uninstallSchema` when present

### Sprint 35: Improve Error Context and Messages
- `lib/resolve-migrations.js`: include definition name in migration resolution errors
- `lib/lookup.js`: add file paths to import errors
- `lib/storage.js`: include context type in unsupported-type errors
- Use structured `{ cause }` chains

### Sprint 36: Add CONTRIBUTING.md
- Development setup, monorepo structure, test instructions
- Coding style (JSDoc-typed JS, not TypeScript)
- How migration dependencies and plugin-importer work

### Sprint 37: Improve README with Architecture Docs
- Architecture overview (install vs upgrade flow)
- Dependency resolution diagram
- Expanded examples, troubleshooting section
- Badges for both packages

### Sprint 38: Add Knip Configuration for Monorepo
- `packages/umzeption/.knip.jsonc` and `packages/umzeption-pg/.knip.jsonc`
- Appropriate entry points and ignore rules per package
- Ensure knip runs cleanly across both packages

### Sprint 39: Update Renovate Configuration for Monorepo
- `renovate.json`: monorepo-aware config for workspace dependencies
- Clean up 9 stale unmerged Renovate PRs

### Sprint 40: Final Template Alignment Audit and Release
- Comprehensive audit against latest `voxpelli/node-module-template`
- Full check suite pass (`npm test`), type-coverage 99%+
- Tag and release v1.0.0 of both packages

---

## Sprint Dependency Graph

```
Sprint 1 (Node engine) ──> Sprint 2 (tsconfig) ──> Sprint 8 (TS 5.9)
Sprint 1 ──> Sprint 33 (fs.glob)
Sprint 7 (eslint-config) ──> Sprint 9 (check:lint)
Sprint 13 (tstyche setup) ──> Sprint 15 (tstyche CI) ──> Sprint 16 (expanded type tests)
Sprint 25 (monorepo init) ──> 26 ──> 27 ──> 28, 29 ──> 30 ──> 31 ──> 32
Sprint 32 (v1.0.0 prep) ──> Sprint 40 (release)
Sprints 3-6 (dep updates) are independent of each other
Sprints 17-23 (code health) are independent of each other
```

## Verification

After each sprint:
1. `npm test` passes (runs check + test:node)
2. `npm run check:tsc` passes (type checking)
3. `npm run check:type-coverage` reports 99%+
4. `npm run check:knip` reports no unused code/deps
5. CI workflows pass on all target Node versions

After Phase 4 (monorepo):
6. `npm test` works at both root and package level
7. Both packages can be independently published
8. Module augmentation correctly extends types across packages

---

## Phase 6: Robustness & Edge Cases (Sprints 41-48)

### Sprint 41: Configurable Migration Table Name
- `packages/umzeption/lib/storage.js`: Add `tableName` constructor param (default `'umzeption_migrations'`), validate with `/^[a-z_][a-z0-9_]*$/i` to prevent injection, replace 4 hardcoded SQL refs
- `packages/umzeption/lib/advanced-types.d.ts`: Update `UmzeptionStorage` constructor signature
- `packages/umzeption-pg/lib/storage.js`: Forward `tableName` to `super()`
- `packages/umzeption-pg/test/storage.spec.js`: Test custom + invalid table names

### Sprint 42: Migration Name Validation
- `packages/umzeption/lib/resolve-migrations.js`: Validate file names don't contain `|` or `:` (delimiters); detect duplicate IDs
- `packages/umzeption/lib/definition.js`: Validate definition `name` excludes `|`/`:`
- `packages/umzeption/test/dependencies.spec.js`: Test forbidden characters

### Sprint 43: Handle Block Comments in SQL Splitting
- `packages/umzeption-pg/lib/schema-helper.js`: Strip `/* */` block comments before splitting; handle semicolons in string literals
- `packages/umzeption-pg/test/schema-helper.spec.js`: Tests for block comments, embedded semicolons

### Sprint 44: Document readdirGlob Fallback Limitations
- `packages/umzeption/lib/resolve-migrations.js`: Emit `process.emitWarning` if pattern contains `**` on Node 20
- `packages/umzeption/README.md`: Add "Compatibility Notes" section

### Sprint 45: ESM Import Validation for Migration Files
- `packages/umzeption/lib/resolve-migrations.js`: Detect CJS-in-ESM errors (`ERR_REQUIRE_ESM`) and throw clear message
- `packages/umzeption/test/fixtures/migrations-cjs/bad.cjs`: CJS fixture for testing

### Sprint 46: Transaction Isolation Level Support
- `packages/umzeption-pg/lib/utils.js`: Optional `{ isolationLevel }` param on `transact()`
- `packages/umzeption-pg/lib/types.d.ts`: Add `TransactOptions` type
- `packages/umzeption-pg/test/pg-utils.spec.js`: Test isolation levels

### Sprint 47: Graceful Handling of Missing Migration Directories
- `packages/umzeption/lib/resolve-migrations.js`: Emit warning when glob patterns match nothing (suppressible via `UMZEPTION_SUPPRESS_WARNINGS`)

### Sprint 48: Add Index on created_at Column
- `packages/umzeption/lib/storage.js`: Add `CREATE INDEX IF NOT EXISTS` after table creation
- `packages/umzeption-pg/test/storage.spec.js`: Verify both queries emitted

---

## Phase 7: Developer Experience (Sprints 49-56)

### Sprint 49: Export UmzeptionDefinition Type
- `packages/umzeption/index.d.ts`: Add `UmzeptionDefinition` to exports
- `packages/umzeption/typetests/main.tst.ts`: Type test for new export

### Sprint 50: Shared Test Utilities
- `packages/umzeption/test/helpers/make-context.js`: `createTestContext()` factory
- `packages/umzeption-pg/test/helpers/make-pg-context.js`: `createTestPgContext()` factory
- Update all test files to use shared helpers

### Sprint 51: Migration Dry-Run / Pending Reporting
- `packages/umzeption/lib/main.js`: New `umzeptionPending(config)` function
- `packages/umzeption/index.js` + `index.d.ts`: Export it
- `packages/umzeption/test/integration.spec.js`: Test pending detection
- `packages/umzeption/README.md`: Document in API section

### Sprint 52: Migration Execution Hooks
- `packages/umzeption/lib/resolve-migrations.js`: Accept `hooks: { beforeMigration, afterMigration }` param
- `packages/umzeption/lib/advanced-types.d.ts`: Add `UmzeptionHooks` interface
- `packages/umzeption/lib/lookup.js`: Forward hooks; wrap install migrations too
- `packages/umzeption/test/integration.spec.js`: Test hooks fire with correct args

### Sprint 53: Pool Lifecycle / Shutdown Hook
- `packages/umzeption-pg/lib/utils.js`: Add `destroy()` method calling `pool.end()`
- `packages/umzeption-pg/lib/types.d.ts`: Add `destroy(): Promise<void>` to `FastifyPostgresStyleDb`
- `packages/umzeption-pg/test/pg-utils.spec.js`: Test destroy

### Sprint 54: Troubleshooting Documentation
- `packages/umzeption/README.md`: Troubleshooting section (unsupported context, CJS errors, empty globs, install vs upgrade)
- `packages/umzeption-pg/README.md`: PG-specific troubleshooting (pool, transactions, SQL splitting)

### Sprint 55: Document No-CLI Design Decision
- `packages/umzeption/README.md`: "Design Decisions" section with CLI entrypoint script example
- `CONTRIBUTING.md`: "Design Principles" subsection

### Sprint 56: Example Project
- `examples/basic-pg/`: `migrate.js`, `package.json`, `migrations/001-create-users.js`, `migrations/002-add-email.js`, `README.md`
- Root config: Ensure examples excluded from workspaces

---

## Phase 8: Advanced Features (Sprints 57-64)

### Sprint 57: Advisory Lock for Concurrent Migration Safety
- `packages/umzeption-pg/lib/advisory-lock.js`: New — `withAdvisoryLock(context, lockId, fn)` using `pg_advisory_lock`
- `packages/umzeption-pg/index.js` + `index.d.ts`: Export it
- `packages/umzeption-pg/test/storage.spec.js`: Test lock acquire/release

### Sprint 58: Migration Timeout Support
- `packages/umzeption/lib/resolve-migrations.js`: Wrap migrations in `Promise.race` with configurable timeout
- `packages/umzeption/lib/advanced-types.d.ts`: Add `timeout?: number` to options
- `packages/umzeption/test/integration.spec.js`: Test timeout rejection

### Sprint 59: Rollback-to-Version Support
- `packages/umzeption/lib/main.js`: New `umzeptionRollbackTarget(config, targetMigration)` utility
- `packages/umzeption/index.js` + `index.d.ts`: Export it
- `packages/umzeption/README.md`: Document rollback workflow

### Sprint 60: Schema Versioning / Checksum
- `packages/umzeption/lib/schema-version.js`: New — `computeSchemaChecksum(definitions)` using SHA-256
- `packages/umzeption/index.js` + `index.d.ts`: Export it
- `packages/umzeption/test/integration.spec.js`: Test checksum stability and sensitivity

### Sprint 61: Structured Error Classes
- `packages/umzeption/lib/errors.js`: New — `UmzeptionValidationError`, `UmzeptionMigrationImportError`, `UmzeptionUnsupportedContextError` with `.code` property
- Update `resolve-migrations.js`, `definition.js`, `storage.js`, `schema-helper.js` to use them
- `packages/umzeption/index.js` + `index.d.ts`: Export error classes

### Sprint 62: Error Recovery Guidance
- `packages/umzeption/README.md`: "Error Recovery" section (partial failures, idempotent installs, rollback)
- `packages/umzeption-pg/README.md`: PG-specific recovery (transaction rollback, checking migration table)

### Sprint 63: Observability Hooks Documentation
- `packages/umzeption/README.md`: "Observability" section showing OpenTelemetry + structured logging via hooks (Sprint 52)
- No new runtime deps — documentation + examples only

### Sprint 64: Support Non-CREATE Statements in installSchemaFromString
- `packages/umzeption-pg/lib/schema-helper.js`: Remove forced `CREATE` prefix; rename `getTablesFromString` to `splitStatements`
- `packages/umzeption-pg/test/schema-helper.spec.js`: Tests for INSERT, ALTER, CREATE INDEX, GRANT, mixed DDL/DML

---

## Phase 9: Testing & Quality (Sprints 65-72)

### Sprint 65: Expand JSDoc Coverage on Internal Functions
- Add `@description` to all internal functions in: `resolve-migrations.js`, `dependencies.js`, `definition.js`, `storage.js`, `utils.js`, `schema-helper.js`

### Sprint 66: Cross-Platform Path Handling Tests
- `packages/umzeption/test/resolve-migrations.spec.js`: New — unit tests for `matchSimplePattern`, `readdirGlob`, deterministic sort, case-sensitive filenames

### Sprint 67: Definition Validation Edge Case Tests
- `packages/umzeption/test/definition.spec.js`: New — tests for empty glob, non-array glob, sync installSchema wrapping, invalid uninstallSchema, extra property passthrough

### Sprint 68: Integration Test with Real PostgreSQL
- `.github/workflows/nodejs.yml`: Add `postgres:16` service container (ubuntu-only)
- `packages/umzeption-pg/test/real-pg.spec.js`: New — real DB tests (skipped if no PGHOST)
- `CONTRIBUTING.md`: Document running real PG tests locally

### Sprint 69: Test Coverage for lookup.js Edge Cases
- `packages/umzeption/test/lookup.spec.js`: New — tests for meta+cwd error, default cwd, noop+install combo, empty deps, uninstallSchema in install mode

### Sprint 70: Type Test Expansion for New APIs
- `packages/umzeption/typetests/main.tst.ts`: Add tests for all new Phase 6-8 exports
- `packages/umzeption-pg/typetests/main.tst.ts`: New — type tests for pg-specific additions
- `packages/umzeption-pg/package.json`: Add `tstyche` + `check-type-tests` script

### Sprint 71: Performance Benchmarks
- `packages/umzeption/test/bench/resolve-migrations.bench.js`: Benchmark 100-file resolution
- `packages/umzeption/test/bench/lookup.bench.js`: Benchmark full lookup with 5 deps × 20 migrations
- `packages/umzeption/package.json`: Add `bench` script

### Sprint 72: Validate release-please Configuration in CI
- `packages/umzeption/test/release-config.spec.js`: Verify every `packages` key has a directory and every `packages/` dir is in config

---

## Phase 10: Ecosystem & Release (Sprints 73-80)

### Sprint 73: Fix umzeption-pg README Badge Links
- `packages/umzeption-pg/README.md`: Remove or conditionally show npm badges until published

### Sprint 74: Review validate-conventional-commit Dependency
- `packages/umzeption/package.json`: Remove if unused (husky hooks deleted); or document if used elsewhere

### Sprint 75: Cross-Platform Clean Scripts
- `packages/umzeption/package.json` + `packages/umzeption-pg/package.json`: Replace shell `find`+`rm` with `scripts/clean-declarations.js` using `readdir`+`unlink`

### Sprint 76: Monitor plugin-importer for Breaking Changes
- `renovate.json`: Add `dependencyDashboardApproval` for `plugin-importer` minor bumps
- `packages/umzeption/test/dependencies.spec.js`: Contract test verifying expected API surface

### Sprint 77: Hand-Authored types.d.ts Drift Detection
- `packages/umzeption-pg/typetests/drift-check.tst.ts`: Verify runtime return types match declared types
- `packages/umzeption/typetests/drift-check.tst.ts`: Same for core

### Sprint 78: Decouple pg-integration Test Fixtures
- `packages/umzeption-pg/test/fixtures/`: Create local fixture copies
- `packages/umzeption-pg/test/pg-integration.spec.js`: Use local `./fixtures/` instead of `../../umzeption/test/fixtures/`

### Sprint 79: Comprehensive Final Audit
- Full `npm test` at root, `check:tsc`, `check:type-coverage` (99%+), `check:knip`
- Verify CI passes on Node 20/22/24 + Linux/Windows
- Review all new exports, READMEs, renovate rules

### Sprint 80: Version Bump, Changelog, and Release
- Bump versions: umzeption 1.1.0 (or 2.0.0 if Sprint 61/64 are breaking), umzeption-pg 1.0.0
- Update CHANGELOGs with all Sprint 41-78 changes
- Update `release-please/manifest.json`
- Tag for release

---

## Sprint Dependency Graph (Phases 6-10)

```
Sprint 41 (table name) ──> Sprint 48 (index), Sprint 57 (advisory lock)
Sprint 43 (block comments) ──> Sprint 64 (broader SQL)
Sprint 50 (test helpers) ──> Sprints 66-69 (new test files)
Sprint 52 (hooks) ──> Sprint 58 (timeout), Sprint 63 (observability)
Sprint 53 (destroy) ──> Sprint 56 (examples show cleanup)
Sprints 49,51,52,57,59,60,61 ──> Sprint 70 (type tests)
Sprint 79 (audit) depends on all 41-78
Sprint 80 (release) depends on Sprint 79
Sprints 42,44,45,46,47,65 are independent
```

After each sprint:
1. `npm test` passes at root level (both packages)
2. `npm run check:tsc` passes (type checking)
3. `npm run check:type-coverage` reports 99%+
4. `npm run check:knip` reports no unused code/deps
5. CI workflows pass on Node 20, 22, 24 (Linux + Windows)

After Phase 10:
6. All new APIs have type tests in `typetests/`
7. All new features documented in README
8. Both packages have consistent versioning
9. Real PostgreSQL integration tests pass in CI
10. No cross-package test fixture coupling remains

---

## Research Sources

This plan was informed by analysis of:
- **voxpelli/node-module-template** - Template standards (engines, scripts, workflows, tstyche, dependency-review)
- **voxpelli/connect-pg-simple** - Precedent for `pg` as regular dep in extracted packages
- **voxpelli/plugin-importer** - Plugin architecture used by umzeption
- **@voxpelli/type-helpers** - Type utility ecosystem (originally extracted from umzeption)
- **neostandard** - ESLint standard co-created by voxpelli
- **tstyche** - Type testing framework adopted by template but missing from umzeption
- **sequelize/umzug** - Parent migration framework
- **Node.js release schedule** - Node 18 EOL, Node 20/22/24 support matrix
- **npm workspaces** - Monorepo pattern for pg extraction
- **TypeScript module augmentation** - Extensibility pattern for separated type definitions
