import sinon from 'sinon';

/** @type {import('sinon').SinonStub<unknown[], unknown>} */
export const up = sinon.stub().resolves();

/** @type {import('sinon').SinonStub<unknown[], unknown>} */
export const down = sinon.stub().resolves();
