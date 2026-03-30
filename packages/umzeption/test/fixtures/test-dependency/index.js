import sinon from 'sinon';

export const glob = ['migrations/*.js'];

/** @type {import('sinon').SinonStub<unknown[], unknown>} */
export const installSchema = sinon.stub().resolves();
