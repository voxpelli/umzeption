import sinon from 'sinon';

/** @satisfies {import('../../../index.js').UmzeptionDependency<unknown>} */
export const umzeptionConfig = {
  glob: ['migrations/*.js'],

  dependencies: [
    '../test-dependency',
    '../test-dependency-2',
  ],

  /** @type {import('sinon').SinonStub<unknown[], Promise<unknown>>} */
  installSchema: sinon.stub().resolves(),
};
