import type { PluginDefinition } from 'plugin-importer';

// What a dependency should provide
export interface UmzeptionDependency<T = unknown> extends PluginDefinition {
  glob: string[]
  installSchema: import('umzug').MigrationFn<T>
}

// The fully resolved internal definition
export interface UmzeptionDefinition<T = unknown> extends UmzeptionDependency<T> {
  name: string
  pluginDir: string
}

export interface UmzeptionLookupOptions<T> extends PartialKeys<
  Omit<UmzeptionDependency<T>, 'pluginDir'>,
  'glob' | 'installSchema'
> {
  cwd?: string|undefined
  install?: boolean
  meta?: ImportMeta
  noop?: boolean
}

// *** Helpers ***

type PartialKeys<T, Keys extends keyof T> = Omit<T, Keys> & Partial<Pick<T, Keys>>;
