/* eslint-disable unicorn/no-useless-undefined */

import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import sinon from 'sinon';

import { resolvePluginsInOrder } from '../lib/plugin-importer/resolve-plugins.js';

describe('Resolve Plugins', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('resolvePluginsInOrder()', () => {
    describe('basic', () => {
      it('should require plugin list to be an array', () => {
        // @ts-ignore
        return assert.rejects(resolvePluginsInOrder(), {
          message: /Expected plugins to be an array of strings/,
        });
      });

      it('should require loadPlugin to be a function', () => {
        // @ts-ignore
        return assert.rejects(resolvePluginsInOrder(['foo']), {
          message: /Expected loadPlugin to be a function/,
        });
      });

      it('should return an empty plugin list straight up', async () => {
        const loadPluginStub = sinon.stub();
        const result = await resolvePluginsInOrder([], loadPluginStub);
        assert.ok(result);
        assert.deepStrictEqual(result, []);
      });

      it('should handle a simple single dependency free plugin', async () => {
        const loadPluginStub = sinon.stub();
        const plugin = {};

        loadPluginStub.onFirstCall().returns(plugin);

        const result = await resolvePluginsInOrder(['foo'], loadPluginStub);
        assert.ok(result);
        assert.strictEqual(result[0], plugin);
      });
    });

    describe('plugin loading', () => {
      it('should keep track of missing dependencies', () => {
        const loadPluginStub = sinon.stub();

        loadPluginStub.onFirstCall().returns(undefined);
        loadPluginStub.onSecondCall().returns({});
        loadPluginStub.onThirdCall().returns(undefined);

        return assert.rejects(resolvePluginsInOrder(['foo', 'bar', 'abc'], loadPluginStub), {
          message: /Plugins missing: "foo", "abc"/,
        });
      });

      it('should handle single missing dependency', () => {
        const loadPluginStub = sinon.stub();

        loadPluginStub.onFirstCall().returns({});
        loadPluginStub.onSecondCall().returns(undefined);

        return assert.rejects(resolvePluginsInOrder(['foo', 'bar'], loadPluginStub), {
          message: /Plugin missing: "bar"/,
        });
      });

      it('should wrap errors thrown when loading', () => {
        const loadPluginStub = sinon.stub();

        loadPluginStub.throws();

        return assert.rejects(resolvePluginsInOrder(['foo'], loadPluginStub), {
          message: /Failed to load plugin "foo"/,
        });
      });
    });

    describe('dependency tree', () => {
      it('should load subdependencies and order dependencies to fulfill prior dependencies', async () => {
        const loadPluginStub = sinon.stub();

        loadPluginStub.withArgs('foo').returns({
          name: 'foo',
          dependencies: ['xyz', 'abc'],
        });
        loadPluginStub.withArgs('xyz').returns({
          name: 'xyz',
          dependencies: ['bar'],
        });
        loadPluginStub.withArgs('abc').returns({
          name: 'abc',
        });
        loadPluginStub.withArgs('bar').returns({
          name: 'bar',
        });

        const result = await resolvePluginsInOrder(['foo', 'bar'], loadPluginStub);
        assert.ok(result);
        assert.deepStrictEqual(result, [
          {
            name: 'bar',
          },
          {
            name: 'xyz',
            dependencies: [
              'bar',
            ],
          },
          {
            name: 'abc',
          },
          {
            name: 'foo',
            dependencies: [
              'xyz',
              'abc',
            ],
          },
        ]);
      });

      it('should throw on circular dependencies', () => {
        const loadPluginStub = sinon.stub();

        loadPluginStub.withArgs('foo').returns({
          name: 'foo',
          dependencies: ['bar'],
        });
        loadPluginStub.withArgs('bar').returns({
          name: 'bar',
          dependencies: ['foo'],
        });

        return assert.rejects(resolvePluginsInOrder(['foo'], loadPluginStub), {
          message: /Failed to add plugin "bar"/,
        });
      });

      it('should allow optional dependencies by default', async () => {
        const loadPluginStub = sinon.stub();

        loadPluginStub.withArgs('foo').returns(undefined);
        loadPluginStub.withArgs('bar').returns('abc123');

        const result = await resolvePluginsInOrder(['foo?', 'bar'], loadPluginStub, true);
        assert.ok(result);
        assert.deepStrictEqual(result, [false, 'abc123']);
      });

      it('should be possible to prohibit optional dependencies', () => {
        const loadPluginStub = sinon.stub();

        loadPluginStub.withArgs('foo').returns(undefined);
        loadPluginStub.withArgs('bar').returns('abc123');

        return assert.rejects(resolvePluginsInOrder(['foo?', 'bar'], loadPluginStub), {
          message: /Plugin missing: "foo\?"/,
        });
      });
    });
  });
});
