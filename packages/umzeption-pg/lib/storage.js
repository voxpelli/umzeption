import { BaseUmzeptionStorage, UmzeptionUnsupportedContextError } from 'umzeption';

/** @typedef {import('./pg-types.d.ts').UmzeptionPgContext} UmzeptionPgContext */

/** @augments {BaseUmzeptionStorage<UmzeptionPgContext>} */
export class UmzeptionPgStorage extends BaseUmzeptionStorage {
  /**
   * @override
   * @type {BaseUmzeptionStorage<UmzeptionPgContext>["query"]}
   */
  async query (context, query, ...values) {
    if (context.type === 'pg') {
      return context.value.query(query, values);
    }
    throw new UmzeptionUnsupportedContextError(context.type);
  }
}
