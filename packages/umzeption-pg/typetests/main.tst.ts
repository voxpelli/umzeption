import { describe, expect, it } from 'tstyche';

import type {
  FastifyPostgresStyleDb,
  UmzeptionPgContext,
} from '../index.d.ts';

import {
  createUmzeptionPgContext,
  pgInstallSchemaFromString,
  withAdvisoryLock,
  UmzeptionPgStorage,
} from '../index.js';

describe('FastifyPostgresStyleDb', () => {
  it('exposes pool, query, connect and transact', () => {
    expect<FastifyPostgresStyleDb>().type.toHaveProperty('pool');
    expect<FastifyPostgresStyleDb>().type.toHaveProperty('query');
    expect<FastifyPostgresStyleDb>().type.toHaveProperty('connect');
    expect<FastifyPostgresStyleDb>().type.toHaveProperty('transact');
  });
});

describe('UmzeptionPgContext', () => {
  it('is a pg-typed context whose value is a FastifyPostgresStyleDb', () => {
    expect<UmzeptionPgContext>().type.toHaveProperty('type');
    expect<UmzeptionPgContext>().type.toHaveProperty('value');
    expect<UmzeptionPgContext['value']>().type.toBe<FastifyPostgresStyleDb>();
  });
});

describe('createUmzeptionPgContext', () => {
  it('is a function returning a pg context', () => {
    expect(createUmzeptionPgContext).type.toBeAssignableTo<(pool: FastifyPostgresStyleDb['pool']) => UmzeptionPgContext>();
  });
});

describe('pgInstallSchemaFromString', () => {
  it('accepts a pg context and an SQL string', () => {
    expect(pgInstallSchemaFromString).type.toBeAssignableTo<(context: UmzeptionPgContext, sql: string) => Promise<void>>();
  });
});

describe('withAdvisoryLock', () => {
  it('is a function', () => {
    expect(withAdvisoryLock).type.toBeAssignableTo<Function>();
  });
});

describe('UmzeptionPgStorage', () => {
  it('is constructable with no arguments and exposes the storage surface', () => {
    expect(UmzeptionPgStorage).type.toBeConstructableWith();
    expect(new UmzeptionPgStorage()).type.toHaveProperty('logMigration');
    expect(new UmzeptionPgStorage()).type.toHaveProperty('unlogMigration');
    expect(new UmzeptionPgStorage()).type.toHaveProperty('executed');
  });
});
