import type { Pool, PoolClient } from 'pg';
import type { UmzeptionContext } from 'umzeption';

export interface FastifyPostgresStyleDb {
  pool: Pool;
  query: Pool['query'];
  connect: Pool['connect'];
  destroy: () => Promise<void>;
  transact: <T = void>(fn: (client: PoolClient) => Promise<T>, options?: { isolationLevel?: 'READ UNCOMMITTED' | 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE' }) => Promise<T>;
}

export type UmzeptionPgContext = UmzeptionContext<'pg', FastifyPostgresStyleDb>;

declare module 'umzeption' {
  interface DefineUmzeptionContexts {
    pg: UmzeptionPgContext;
  }
}
