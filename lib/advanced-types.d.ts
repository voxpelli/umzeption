import type { PluginDefinition } from 'plugin-importer';

// What a dependency should provide
export interface UmzeptionDependency<T extends AnyUmzeptionContext = AnyUmzeptionContext> extends PluginDefinition {
  glob: string[]
  installSchema: import('umzug').MigrationFn<T>
}

// The fully resolved internal definition
export interface UmzeptionDefinition<T extends AnyUmzeptionContext = AnyUmzeptionContext> extends UmzeptionDependency<T> {
  name: string
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

// *** Context definitions ***

export interface DefineUmzeptionContexts {
  unknown: UmzeptionContext<'unknown'>,
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

export interface UmzeptionContext<T extends UmzeptionContextTypes, V = unknown> extends BaseUmzeptionContext {
  type: string extends T ? never : (T extends string ? T : never);
  value: V
}

// *** Helpers ***

type PartialKeys<T, Keys extends keyof T> = Omit<T, Keys> & Partial<Pick<T, Keys>>;
type StringLiteral<T> = string extends T ? never : T;
type Equal<A, B> = A extends B ? A : never;
