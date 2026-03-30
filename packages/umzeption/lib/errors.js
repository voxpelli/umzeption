export class UmzeptionError extends Error {
  /** @type {string} */
  code;

  /**
   * @param {string} message
   * @param {string} code
   * @param {{ cause?: unknown }} [options]
   */
  constructor (message, code, options) {
    super(message, options);
    /** @type {string} */
    this.name = 'UmzeptionError';
    this.code = code;
  }
}

export class UmzeptionValidationError extends UmzeptionError {
  /**
   * @param {string} message
   * @param {{ cause?: unknown }} [options]
   */
  constructor (message, options) {
    super(message, 'UMZEPTION_VALIDATION_ERROR', options);
    /** @type {string} */
    this.name = 'UmzeptionValidationError';
  }
}

export class UmzeptionMigrationImportError extends UmzeptionError {
  /**
   * @param {string} message
   * @param {{ cause?: unknown }} [options]
   */
  constructor (message, options) {
    super(message, 'UMZEPTION_MIGRATION_IMPORT_ERROR', options);
    /** @type {string} */
    this.name = 'UmzeptionMigrationImportError';
  }
}

export class UmzeptionUnsupportedContextError extends UmzeptionError {
  /**
   * @param {string} contextType
   * @param {{ cause?: unknown }} [options]
   */
  constructor (contextType, options) {
    super(`Unsupported context type: ${contextType}`, 'UMZEPTION_UNSUPPORTED_CONTEXT', options);
    /** @type {string} */
    this.name = 'UmzeptionUnsupportedContextError';
  }
}
