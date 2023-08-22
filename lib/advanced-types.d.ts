// @ts-ignore Ignoring to avoid strict dependency on 'pg'
import type { Pool as PgPool, PoolClient as PgPoolClient } from 'pg';
import type { PluginDefinition } from 'plugin-importer';
import type { MigrationParams, UmzugStorage } from 'umzug';

import type {
  AnyDeclaration,
  AnyDeclarationType,
  ValidDeclaration
} from './types/declaration-types.d.ts';
import type { PartialKeys } from './types/util-types.d.ts';

// What a dependency should provide
export interface UmzeptionDependency<T extends AnyUmzeptionContext = AnyUmzeptionContext> extends PluginDefinition {
  glob: string[]
  installSchema: import('umzug').MigrationFn<T>
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
  >
{
  cwd?: string|undefined
  install?: boolean
  meta?: ImportMeta
  noop?: boolean
}

// *** Storage ***

export abstract class UmzeptionStorage<T extends AnyUmzeptionContext> implements UmzugStorage<T> {
  // From UmzugStorage
  logMigration: (params: MigrationParams<T>) => Promise<void>;
  unlogMigration: (params: MigrationParams<T>) => Promise<void>;
  executed: (meta: Pick<MigrationParams<T>, 'context'>) => Promise<string[]>;

  // Extensions
  ensureTable (context: T): Promise<void>
  query (context: T, query: string, ...values: string[]): Promise<{ rows: Array<{ [column: string]: unknown }> }>
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
export type UmzeptionContextTypes = AnyDeclarationType<DefineUmzeptionContexts, UmzeptionContextExtras>

export interface UmzeptionContext<T extends UmzeptionContextTypes, V>
  extends ValidDeclaration<DefineUmzeptionContexts, UmzeptionContextExtras, T>
{
  value: V
}

// *** Postgres context **

// TODO: Extract pg context into a "umzeption-pg" module

type FastifyPostgresStyleTransactCallback = (client: PgPoolClient) => void;
type FastifyPostgresStyleTransact = (callback: FastifyPostgresStyleTransactCallback) => void;

export type FastifyPostgresStyleDb = {
  pool: PgPool;
  query: PgPool["query"];
  connect: PgPool["connect"];
  transact: FastifyPostgresStyleTransact;
};
