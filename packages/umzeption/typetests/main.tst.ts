import { describe, expect, it } from 'tstyche';

import type {
  AnyUmzeptionContext,
  DefineUmzeptionContexts,
  FastifyPostgresStyleDb,
  UmzeptionContext,
  UmzeptionDependency,
  UmzeptionLookupOptions,
  UmzeptionStorage,
} from '../index.d.ts';

import {
  createUmzeptionContext,
  createUmzeptionPgContext,
  installSchemaFromString,
  pgInstallSchemaFromString,
  umzeption,
  BaseUmzeptionStorage,
  UmzeptionPgStorage,
} from '../index.js';

describe('UmzeptionContext', () => {
  it('should have type and value fields', () => {
    expect<UmzeptionContext<'pg', FastifyPostgresStyleDb>>().type.toBeAssignableTo<AnyUmzeptionContext>();
    expect<UmzeptionContext<'unknown', unknown>>().type.toBeAssignableTo<AnyUmzeptionContext>();
  });
});

describe('DefineUmzeptionContexts', () => {
  it('should include pg and unknown context keys', () => {
    expect<keyof DefineUmzeptionContexts>().type.toEqual<'pg' | 'unknown'>();
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

describe('createUmzeptionPgContext', () => {
  it('should be a function', () => {
    expect(createUmzeptionPgContext).type.toBeAssignableTo<Function>();
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

describe('pgInstallSchemaFromString', () => {
  it('should be a function accepting pg context and sql string', () => {
    expect(pgInstallSchemaFromString).type.toBeAssignableTo<(context: UmzeptionContext<'pg', FastifyPostgresStyleDb>, sql: string) => Promise<void>>();
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

describe('UmzeptionPgStorage', () => {
  it('should extend BaseUmzeptionStorage', () => {
    expect(new UmzeptionPgStorage()).type.toBeAssignableTo<BaseUmzeptionStorage<AnyUmzeptionContext>>();
  });
});
