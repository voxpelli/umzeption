import type { UmzeptionDefinition } from './lib/definition.js';
import type { PartialKeys } from './lib/utils.js';

export type UmzeptionDependency<T> = PartialKeys<UmzeptionDefinition<T>, 'name' | 'pluginDir'>;

export type {
  UmzeptionLookupOptions
} from './lib/lookup.js';


export {
  umzeption
} from './lib/main.js';
