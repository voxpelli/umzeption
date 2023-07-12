/// <reference types="node" />
/// <reference types="mocha" />
/// <reference types="chai" />
/// <reference types="sinon" />
/// <reference types="sinon-chai" />

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import { normalizePluginName } from '../lib/normalize-plugin-name.js';

chai.use(chaiAsPromised);
chai.use(sinonChai);

const should = chai.should();

describe('Normalize Plugin Name', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('normalizePluginName()', () => {
    it('should require a string pluginName argument', () => {
      // @ts-ignore
      should.Throw(() => { normalizePluginName(); }, TypeError, 'Invalid pluginName, expected a non-empty string');
      // @ts-ignore
      should.Throw(() => { normalizePluginName(123); }, TypeError, 'Invalid pluginName, expected a non-empty string');
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
      const result = normalizePluginName('foo', { prefix: 'example-prefix-' });
      should.exist(result);
      result.should.equal('example-prefix-foo');
    });

    it('should not add prefix if already prefixed', () => {
      const result = normalizePluginName('example-prefix-foo', { prefix: 'example-prefix-' });
      should.exist(result);
      result.should.equal('example-prefix-foo');
    });

    it('should return normalized local path unaltered', () => {
      normalizePluginName('./foo/../bar/', { prefix: 'example-prefix-' })
        .should.equal('./bar/');
      normalizePluginName('./foo', { prefix: 'example-prefix-' })
        .should.equal('./foo');
      normalizePluginName('./foo/../bar/')
        .should.equal('./bar/');
      normalizePluginName('./foo')
        .should.equal('./foo');
    });
  });
});
