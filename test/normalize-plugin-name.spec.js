import { describe, it } from 'node:test';

import chai from 'chai';
import chaiPosixPath from 'chai-posix-path';

import { normalizePluginName } from '../lib/plugin-importer/normalize-plugin-name.js';

chai.use(chaiPosixPath);

const should = chai.should();

describe('Normalize Plugin Name', () => {
  describe('normalizePluginName()', () => {
    it('should require a substantive string pluginName argument', () => {
      // @ts-ignore
      should.Throw(() => { normalizePluginName(); }, TypeError, 'Invalid pluginName, expected a string');
      // @ts-ignore
      should.Throw(() => { normalizePluginName(123); }, TypeError, 'Invalid pluginName, expected a string');

      should.Throw(() => { normalizePluginName(''); }, Error, 'Invalid pluginName, expected the string to be non-empty');

      should.Throw(() => { normalizePluginName('   '); }, Error, 'Invalid pluginName, expected the string to not begin or end with whitespace');
      should.Throw(() => { normalizePluginName('foo   '); }, Error, 'Invalid pluginName, expected the string to not begin or end with whitespace');
      should.Throw(() => { normalizePluginName('   foo'); }, Error, 'Invalid pluginName, expected the string to not begin or end with whitespace');
      should.Throw(() => { normalizePluginName('   foo   '); }, Error, 'Invalid pluginName, expected the string to not begin or end with whitespace');
    });

    it('should throw on upwards directory traversing', () => {
      should.not.Throw(() => { normalizePluginName('./foo/../bar/'); });
      should.Throw(() => { normalizePluginName('./foo/../../bar/'); }, 'Plugin name attempts directory traversal: "./foo/../../bar/"');
    });

    it('should return simple plugin name unaltered', () => {
      const result = normalizePluginName('foo');
      should.exist(result);
      result.should.equal('foo');
    });

    it('should add prefix when one is set', () => {
      const result = normalizePluginName('foo', 'example-prefix');
      should.exist(result);
      result.should.equal('example-prefix-foo');
    });

    it('should add prefix as suffix to plain scopes', () => {
      const result = normalizePluginName('@foo', 'example-prefix');
      should.exist(result);
      result.should.equal('@foo/example-prefix');
    });

    it('should not add prefix if already prefixed', () => {
      const result = normalizePluginName('example-prefix-foo', 'example-prefix');
      should.exist(result);
      result.should.equal('example-prefix-foo');
    });

    it('should return local path without prefix but normalized', () => {
      normalizePluginName('./foo/../bar/', 'example-prefix')
        .should.be.posixPath('./bar/');
      normalizePluginName('./foo', 'example-prefix')
        .should.be.posixPath('./foo');
      normalizePluginName('./foo/../bar/')
        .should.be.posixPath('./bar/');
      normalizePluginName('./foo')
        .should.be.posixPath('./foo');
    });
  });
});
