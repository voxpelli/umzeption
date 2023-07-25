import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { getExtensionlessBasename } from '../lib/utils.js';

describe('Utils', () => {
  describe('getExtensionlessBasename()', () => {
    it('should require a string argument', () => {
      // @ts-ignore
      assert.throws(() => { getExtensionlessBasename(); }, {
        name: 'TypeError',
        message: 'Invalid value, expected a string',
      });
      // @ts-ignore
      assert.throws(() => { getExtensionlessBasename(123); }, {
        name: 'TypeError',
        message: 'Invalid value, expected a string',
      });
    });

    it('should return basename', () => {
      const result = getExtensionlessBasename('./foo/bar/abc');
      assert.ok(result);
      assert.strictEqual(result, 'abc');
    });

    it('should strip file extension from basename', () => {
      const result = getExtensionlessBasename('./foo/bar/something-foo.js');
      assert.ok(result);
      assert.strictEqual(result, 'something-foo');
    });

    it('should strip complex file extension from basename', () => {
      const result = getExtensionlessBasename('./foo/bar/something-foo.d.ts');
      assert.ok(result);
      assert.strictEqual(result, 'something-foo');
    });
  });
});
