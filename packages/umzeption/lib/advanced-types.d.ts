import type { PluginDefinition } from 'plugin-importer';
import type { MigrationParams, UmzugStorage } from 'umzug';

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
  uninstallSchema?: import('umzug').MigrationFn<T>
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

// *** Storage ***

export abstract class UmzeptionStorage<T extends AnyUmzeptionContext> implements UmzugStorage<T> {
  constructor (options?: { tableName?: string });

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

/**
 * Extensible context registry. Adapter packages (e.g. umzeption-pg) augment
 * this interface via `declare module 'umzeption'` to add their context types.
 */
export interface DefineUmzeptionContexts {
  unknown: UmzeptionContext<'unknown', unknown>,
}

export type AnyUmzeptionContext = AnyDeclaration<DefineUmzeptionContexts, UmzeptionContextExtras>;
export type UmzeptionContextTypes = AnyDeclarationType<DefineUmzeptionContexts, UmzeptionContextExtras>;

export interface UmzeptionContext<T extends UmzeptionContextTypes, V>
  extends ValidDeclaration<T, DefineUmzeptionContexts, UmzeptionContextExtras> {
  value: V
}
