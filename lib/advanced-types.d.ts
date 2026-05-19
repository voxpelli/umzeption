// @ts-ignore Ignoring to avoid strict dependency on 'pg'
import type { Pool as PgPool, PoolClient as PgPoolClient } from 'pg';
import type { PluginDefinition } from 'plugin-importer';
import type { MigrationParams, Umzug, UmzugStorage } from 'umzug';

import type {
  AnyDeclaration,
  AnyDeclarationType,
  PartialKeys,
  ValidDeclaration,
} from '@voxpelli/type-helpers';

// What a dependency should provide
export interface UmzeptionDependency<T extends AnyUmzeptionContext = AnyUmzeptionContext> extends PluginDefinition {
  glob: string[]
  installSchema: import('umzug').MigrationFn<T>
  /**
   * Custom sort transformer applied to this dependency's migration file paths
   * before they are wrapped as Umzug RunnableMigrations. Receives the absolute
   * paths globbed from `glob`, plus `{ pluginDir }` so the prefix can be
   * stripped when needed (e.g. for numeric or length-based comparisons).
   *
   * When set on a UmzeptionDependency, it wins over the top-level
   * `sortFiles` on UmzeptionLookupOptions for that dependency only.
   * Use `(files) => files` to opt out of sorting entirely.
   *
   * @see README — "Notes on sortFiles ordering" for the
   *   allowConfusingOrdering interaction and the upgrade-from-pre-sort caveat.
   */
  sortFiles?: ((files: string[], context: { pluginDir: string }) => string[]) | undefined
}

// The fully resolved internal definition
export interface UmzeptionDefinition<T extends AnyUmzeptionContext = AnyUmzeptionContext> extends UmzeptionDependency<T> {
  name: string
  noPrefix?: boolean
  pluginDir: string
}

export interface UmzeptionLookupOptions<T extends AnyUmzeptionContext> extends
  PartialKeys<
    Omit<UmzeptionDependency<T>, 'pluginDir'>,
    'glob' | 'installSchema'
  > {
  cwd?: string | undefined
  install?: boolean
  meta?: ImportMeta
  noop?: boolean
}

// *** Helper factory options + instance ***

export interface CreateUmzeptionOptions<T extends AnyUmzeptionContext> {
  // `install` is omitted because the factory owns both modes (upgrade and
  // install-mode Umzug instances) and routes via `runAsCLI('install')` /
  // `instance.installUmzug`. A caller-supplied `install` flag would be
  // silently overridden at runtime; omitting it surfaces the mistake at
  // compile time instead.
  umzeption: Omit<UmzeptionLookupOptions<T>, 'install'>
  context: T
  storage: UmzugStorage<T>
  logger?: ConstructorParameters<typeof Umzug<T>>[0]['logger']
  create?: ConstructorParameters<typeof Umzug<T>>[0]['create']
}

export interface UmzeptionInstance<T extends AnyUmzeptionContext> {
  /** Umzug instance in upgrade mode (install: false). Use for programmatic up/down/pending. */
  umzug: Umzug<T>
  /**
   * Lazily-built Umzug instance in install mode (install: true). Used by
   * `runAsCLI('install')`; also useful for test bootstraps that need a
   * ready install-mode Umzug. See README for integration recipes.
   */
  readonly installUmzug: Umzug<T>
  /** CLI dispatcher. Adds `install` subcommand on top of Umzug's built-in commands; passes everything else straight through. */
  runAsCLI: (argv?: string[]) => Promise<boolean>
}

// *** Storage ***

export abstract class UmzeptionStorage<T extends AnyUmzeptionContext> implements UmzugStorage<T> {
  // From UmzugStorage
  logMigration: (params: MigrationParams<T>) => Promise<void>;
  unlogMigration: (params: MigrationParams<T>) => Promise<void>;
  executed: (meta: Pick<MigrationParams<T>, 'context'>) => Promise<string[]>;

  // Extensions
  ensureTable (context: T): Promise<void>;
  query (context: T, query: string, ...values: string[]): Promise<{ rows: Array<{ [column: string]: unknown }> }>;
}

// *** Context definitions ***

interface UmzeptionContextExtras {
  value: unknown
}

export interface DefineUmzeptionContexts {
  pg: UmzeptionContext<'pg', FastifyPostgresStyleDb>,
  unknown: UmzeptionContext<'unknown', unknown>,
}

export type AnyUmzeptionContext = AnyDeclaration<DefineUmzeptionContexts, UmzeptionContextExtras>;
export type UmzeptionContextTypes = AnyDeclarationType<DefineUmzeptionContexts, UmzeptionContextExtras>;

export interface UmzeptionContext<T extends UmzeptionContextTypes, V>
  extends ValidDeclaration<T, DefineUmzeptionContexts, UmzeptionContextExtras> {
  value: V
}

// *** Postgres context **

// TODO: Extract pg context into a "umzeption-pg" module

type FastifyPostgresStyleTransactCallback = (client: PgPoolClient) => void | Promise<void>;
type FastifyPostgresStyleTransact = (callback: FastifyPostgresStyleTransactCallback) => Promise<void>;

export type FastifyPostgresStyleDb = {
  pool: PgPool;
  query: PgPool['query'];
  connect: PgPool['connect'];
  transact: FastifyPostgresStyleTransact;
};
