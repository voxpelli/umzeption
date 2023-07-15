import { describe, it } from 'node:test';

import chai from 'chai';

import { getExtensionlessBasename } from '../lib/utils.js';

const should = chai.should();

describe('Utils', () => {
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
