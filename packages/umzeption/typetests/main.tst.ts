import { describe, expect, it } from 'tstyche';

import type {
  AnyUmzeptionContext,
  DefineUmzeptionContexts,
  UmzeptionContext,
  UmzeptionDependency,
  UmzeptionLookupOptions,
  UmzeptionStorage,
} from '../index.d.ts';

import {
  createUmzeptionContext,
  installSchemaFromString,
  umzeption,
  BaseUmzeptionStorage,
} from '../index.js';

describe('UmzeptionContext', () => {
  it('should have type and value fields', () => {
    expect<UmzeptionContext<'unknown', unknown>>().type.toBeAssignableTo<AnyUmzeptionContext>();
  });
});

describe('DefineUmzeptionContexts', () => {
  it('should include the unknown context key by default', () => {
    expect<keyof DefineUmzeptionContexts>().type.toEqual<'unknown'>();
  });
});

describe('createUmzeptionContext', () => {
  it('should be a function', () => {
    expect(createUmzeptionContext).type.toBeAssignableTo<Function>();
  });
  it('should return UmzeptionContext', () => {
    expect(createUmzeptionContext('unknown', {})).type.toBeAssignableTo<AnyUmzeptionContext>();
  });
});

describe('umzeption', () => {
  it('should be a function', () => {
    expect(umzeption).type.toBeAssignableTo<Function>();
  });
});

describe('installSchemaFromString', () => {
  it('should be a function accepting context and sql string', () => {
    expect(installSchemaFromString).type.toBeAssignableTo<(context: AnyUmzeptionContext, sql: string) => Promise<void>>();
  });
});

describe('UmzeptionDependency', () => {
  it('should be assignable to base from AnyUmzeptionContext', () => {
    expect<UmzeptionDependency<AnyUmzeptionContext>>().type.toHaveProperty('glob');
    expect<UmzeptionDependency<AnyUmzeptionContext>>().type.toHaveProperty('installSchema');
  });
});

describe('UmzeptionLookupOptions', () => {
  it('should have optional glob and installSchema', () => {
    const _opts: UmzeptionLookupOptions<AnyUmzeptionContext> = {};
    expect(_opts).type.toBeDefined();
  });
});

describe('UmzeptionStorage', () => {
  it('should be an abstract class interface', () => {
    expect<UmzeptionStorage<AnyUmzeptionContext>>().type.toHaveProperty('logMigration');
    expect<UmzeptionStorage<AnyUmzeptionContext>>().type.toHaveProperty('unlogMigration');
    expect<UmzeptionStorage<AnyUmzeptionContext>>().type.toHaveProperty('executed');
  });
});

describe('BaseUmzeptionStorage', () => {
  it('should be constructable', () => {
    expect(new BaseUmzeptionStorage()).type.toBeAssignableTo<UmzeptionStorage<AnyUmzeptionContext>>();
  });
});
