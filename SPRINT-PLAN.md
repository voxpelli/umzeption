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
