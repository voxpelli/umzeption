import { BaseUmzeptionStorage } from '../storage.js';

/** @typedef {import('../advanced-types.js').DefineUmzeptionContexts['pg']} UmzeptionPgContext */

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
    throw new Error(`Unsupported context type: ${context.type}`);
  }
}
