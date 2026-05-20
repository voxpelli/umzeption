import { describe, expect, it } from 'tstyche';

import {
  BaseUmzeptionStorage,
  createUmzeptionContext,
  installSchemaFromString,
  umzeption,
} from '../index.js';

import type {
  AnyUmzeptionContext,
  DefineUmzeptionContexts,
  UmzeptionContext,
  UmzeptionDependency,
  UmzeptionLookupOptions,
  UmzeptionStorage,
} from '../index.d.ts';

describe('UmzeptionContext', () => {
  it('should have type and value fields', () => {
    expect<UmzeptionContext<'unknown', unknown>>().type.toBeAssignableTo<AnyUmzeptionContext>();
  });
});

describe('DefineUmzeptionContexts', () => {
  it('should include the unknown context key by default', () => {
    // Holds only because this test does NOT import umzeption-pg: importing it
    // would activate the `declare module 'umzeption'` augmentation that adds
    // the 'pg' key, making this `'unknown' | 'pg'`. Keep this file pg-free.
    expect<keyof DefineUmzeptionContexts>().type.toBe<'unknown'>();
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
  it('should be satisfiable with an empty object (all fields optional)', () => {
    // An empty object is only assignable if every field — incl. glob and
    // installSchema — is optional on UmzeptionLookupOptions.
    expect({}).type.toBeAssignableTo<UmzeptionLookupOptions<AnyUmzeptionContext>>();
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
