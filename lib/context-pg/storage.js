import { BaseUmzeptionStorage } from '../storage.js';

/** @import { DefineUmzeptionContexts } from '../advanced-types.d.ts' */
/** @typedef {DefineUmzeptionContexts['pg']} UmzeptionPgContext */

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
