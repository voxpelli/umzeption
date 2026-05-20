import { describe, expect, it } from 'tstyche';

import {
  createUmzeptionPgContext,
  pgInstallSchemaFromString,
  UmzeptionPgStorage,
  withAdvisoryLock,
} from '../index.js';

import type { UmzeptionStorage } from 'umzeption';

import type {
  FastifyPostgresStyleDb,
  UmzeptionPgContext,
} from '../index.d.ts';

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
  it('takes (context, lockId, fn, options?) and returns the callback result', () => {
    expect(withAdvisoryLock).type.toBeAssignableTo<
      (
        context: UmzeptionPgContext,
        lockId: number,
        fn: () => Promise<unknown>,
        options?: { lockTimeoutMs?: number }
      ) => Promise<unknown>
    >();
  });
});

describe('UmzeptionPgStorage', () => {
  it('is constructable with no arguments and satisfies the UmzeptionStorage contract', () => {
    expect(UmzeptionPgStorage).type.toBeConstructableWith();
    // The load-bearing contract: the pg adapter storage must be substitutable
    // for the core UmzeptionStorage interface with a pg context. This catches
    // method-signature drift that name-only property probes would miss.
    expect(new UmzeptionPgStorage()).type.toBeAssignableTo<UmzeptionStorage<UmzeptionPgContext>>();
  });
});
