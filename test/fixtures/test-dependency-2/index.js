import sinon from 'sinon';

export const glob = ['migrations/*.js'];

export const dependencies = [
  '../test-dependency',
];

/** @type {import('sinon').SinonStub<unknown[], unknown>} */
export const installSchema = sinon.stub().resolves();
