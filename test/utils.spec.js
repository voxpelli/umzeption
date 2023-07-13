/// <reference types="node" />
/// <reference types="mocha" />
/// <reference types="chai" />
/// <reference types="sinon" />
/// <reference types="sinon-chai" />

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import { getExtensionlessBasename } from '../lib/utils.js';

chai.use(chaiAsPromised);
chai.use(sinonChai);

const should = chai.should();

describe('Utils', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('getExtensionlessBasename()', () => {
    it('should require a string argument', () => {
      // @ts-ignore
      should.Throw(() => { getExtensionlessBasename(); }, TypeError, 'Invalid value, expected a string');
      // @ts-ignore
      should.Throw(() => { getExtensionlessBasename(123); }, TypeError, 'Invalid value, expected a string');
    });

    it('should return basename', () => {
      const result = getExtensionlessBasename('./foo/bar/abc');
      should.exist(result);
      result.should.equal('abc');
    });

    it('should strip file extension from basename', () => {
      const result = getExtensionlessBasename('./foo/bar/something-foo.js');
      should.exist(result);
      result.should.equal('something-foo');
    });

    it('should strip complex file extension from basename', () => {
      const result = getExtensionlessBasename('./foo/bar/something-foo.d.ts');
      should.exist(result);
      result.should.equal('something-foo');
    });
  });
});
