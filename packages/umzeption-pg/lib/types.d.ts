// @ts-ignore Ignoring to avoid strict dependency on 'pg'
import type { Pool as PgPool, PoolClient as PgPoolClient } from 'pg';

import type { UmzeptionContext } from 'umzeption';

// *** Postgres types ***

type FastifyPostgresStyleTransactCallback = (client: PgPoolClient) => void;
type FastifyPostgresStyleTransact = (callback: FastifyPostgresStyleTransactCallback) => void;

export type FastifyPostgresStyleDb = {
  pool: PgPool;
  query: PgPool['query'];
  connect: PgPool['connect'];
  transact: FastifyPostgresStyleTransact;
};

export type UmzeptionPgContext = UmzeptionContext<'pg', FastifyPostgresStyleDb>;

// *** Module augmentation: extend core umzeption with pg context type ***

declare module 'umzeption' {
  interface DefineUmzeptionContexts {
    pg: UmzeptionContext<'pg', FastifyPostgresStyleDb>
  }
}
