// @ts-ignore Avoid strict dependency on 'pg'
import type { Pool as PgPool, PoolClient as PgPoolClient } from 'pg';
import type { PluginDefinition } from 'plugin-importer';
import type { MigrationParams, UmzugStorage } from 'umzug';

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

export interface DefineUmzeptionContexts {
  pg: UmzeptionContext<'pg', FastifyPostgresStyleDb>,
  unknown: UmzeptionContext<'unknown', unknown>,
}

type ValidUmzeptionContexts = {
  [key in keyof DefineUmzeptionContexts as (
    DefineUmzeptionContexts[key] extends BaseUmzeptionContext
      ? Equal<key, DefineUmzeptionContexts[key]["type"]>
      : never
  )]: string extends key ? never : DefineUmzeptionContexts[key]
}

export type AnyUmzeptionContext = ValidUmzeptionContexts[keyof ValidUmzeptionContexts];
export type UmzeptionContextTypes = AnyUmzeptionContext["type"];

interface BaseUmzeptionContext {
  type: string
  value: unknown
}

export interface UmzeptionContext<T extends UmzeptionContextTypes, V> extends BaseUmzeptionContext {
  type: string extends T ? never : (T extends string ? T : never);
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

// *** Helpers ***

type PartialKeys<T, Keys extends keyof T> = Omit<T, Keys> & Partial<Pick<T, Keys>>;
type StringLiteral<T> = string extends T ? never : T;
type Equal<A, B> = A extends B ? A : never;
