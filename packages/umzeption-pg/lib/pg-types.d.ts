import type { Pool, PoolClient } from 'pg';
import type { UmzeptionContext } from 'umzeption';

export interface FastifyPostgresStyleDb {
  pool: Pool;
  query: Pool['query'];
  connect: Pool['connect'];
  destroy: () => Promise<void>;
  transact: (fn: (client: PoolClient) => Promise<void>, options?: { isolationLevel?: string }) => Promise<void>;
}

export type UmzeptionPgContext = UmzeptionContext<'pg', FastifyPostgresStyleDb>;

declare module 'umzeption' {
  interface DefineUmzeptionContexts {
    pg: UmzeptionPgContext;
  }
}
