import { describe, it } from 'node:test';
import assert, { AssertionError } from 'node:assert/strict';

import { normalizePluginName } from '../lib/plugin-importer/normalize-plugin-name.js';

/**
 * @param {string} sourcePath
 * @param {string} targetPath
 * @returns {void}
 */
function assertPosixPath (sourcePath, targetPath) {
  const posixPath = sourcePath.split('\\').join('/');

  if (posixPath !== targetPath) {
    throw new AssertionError({
      message: `expected ${sourcePath} to translate to posix path ${targetPath} but translated to ${posixPath}`,
      actual: posixPath,
      expected: targetPath,
    });
  }
}

describe('Normalize Plugin Name', () => {
  describe('normalizePluginName()', () => {
    it('should require a substantive string pluginName argument', () => {
      // @ts-ignore
      assert.throws(() => { normalizePluginName(); }, {
        name: 'TypeError',
        message: 'Invalid pluginName, expected a string',
      });
      // @ts-ignore
      assert.throws(() => { normalizePluginName(123); }, {
        name: 'TypeError',
        message: 'Invalid pluginName, expected a string',
      });

      assert.throws(() => { normalizePluginName(''); }, {
        name: 'Error',
        message: 'Invalid pluginName, expected the string to be non-empty',
      });

      assert.throws(() => { normalizePluginName('   '); }, {
        name: 'Error',
        message: 'Invalid pluginName, expected the string to not begin or end with whitespace',
      });
      assert.throws(() => { normalizePluginName('foo   '); }, {
        name: 'Error',
        message: 'Invalid pluginName, expected the string to not begin or end with whitespace',
      });
      assert.throws(() => { normalizePluginName('   foo'); }, {
        name: 'Error',
        message: 'Invalid pluginName, expected the string to not begin or end with whitespace',
      });
      assert.throws(() => { normalizePluginName('   foo   '); }, {
        name: 'Error',
        message: 'Invalid pluginName, expected the string to not begin or end with whitespace',
      });
    });

    it('should throw on upwards directory traversing', () => {
      assert.doesNotThrow(() => { normalizePluginName('./foo/../bar/'); });
      assert.throws(() => { normalizePluginName('./foo/../../bar/'); }, {
        message: 'Plugin name attempts directory traversal: "./foo/../../bar/"',
      });
    });

    it('should return simple plugin name unaltered', () => {
      const result = normalizePluginName('foo');
      assert.ok(result);
      assert.strictEqual(result, 'foo');
    });

    it('should add prefix when one is set', () => {
      const result = normalizePluginName('foo', 'example-prefix');
      assert.ok(result);
      assert.strictEqual(result, 'example-prefix-foo');
    });

    it('should add prefix as suffix to plain scopes', () => {
      const result = normalizePluginName('@foo', 'example-prefix');
      assert.ok(result);
      assert.strictEqual(result, '@foo/example-prefix');
    });

    it('should not add prefix if already prefixed', () => {
      const result = normalizePluginName('example-prefix-foo', 'example-prefix');
      assert.ok(result);
      assert.strictEqual(result, 'example-prefix-foo');
    });

    it('should return local path without prefix but normalized', () => {
      assertPosixPath(
        normalizePluginName('./foo/../bar/', 'example-prefix'),
        './bar/'
      );
      assertPosixPath(
        normalizePluginName('./foo', 'example-prefix'),
        './foo'
      );
      assertPosixPath(
        normalizePluginName('./foo/../bar/'),
        './bar/'
      );
      assertPosixPath(
        normalizePluginName('./foo'),
        './foo'
      );
    });
  });
});
