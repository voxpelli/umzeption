/* eslint-disable unicorn/no-useless-undefined */

import { describe, it, afterEach } from 'node:test';

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import { resolvePluginsInOrder } from '../lib/plugin-importer/resolve-plugins.js';

chai.use(chaiAsPromised);
chai.use(sinonChai);

const should = chai.should();

describe('Resolve Plugins', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('resolvePluginsInOrder()', () => {
    describe('basic', () => {
      it('should require plugin list to be an array', () => {
        // @ts-ignore
        return resolvePluginsInOrder()
          .should.be.rejectedWith(/Expected plugins to be an array of strings/);
      });

      it('should require loadPlugin to be a function', () => {
        // @ts-ignore
        return resolvePluginsInOrder(['foo'])
          .should.be.rejectedWith(/Expected loadPlugin to be a function/);
      });

      it('should return an empty plugin list straight up', async () => {
        const loadPluginStub = sinon.stub();
        const result = await resolvePluginsInOrder([], loadPluginStub);
        should.exist(result);
        result.should.deep.equal([]);
      });

      it('should handle a simple single dependency free plugin', async () => {
        const loadPluginStub = sinon.stub();
        const plugin = {};

        loadPluginStub.onFirstCall().returns(plugin);

        const result = await resolvePluginsInOrder(['foo'], loadPluginStub);
        should.exist(result);
        result.should.have.property('0', plugin);
      });
    });

    describe('plugin loading', () => {
      it('should keep track of missing dependencies', () => {
        const loadPluginStub = sinon.stub();

        loadPluginStub.onFirstCall().returns(undefined);
        loadPluginStub.onSecondCall().returns({});
        loadPluginStub.onThirdCall().returns(undefined);

        return resolvePluginsInOrder(['foo', 'bar', 'abc'], loadPluginStub)
          .should.be.rejectedWith(/Plugins missing: "foo", "abc"/);
      });

      it('should handle single missing dependency', () => {
        const loadPluginStub = sinon.stub();

        loadPluginStub.onFirstCall().returns({});
        loadPluginStub.onSecondCall().returns(undefined);

        return resolvePluginsInOrder(['foo', 'bar'], loadPluginStub)
          .should.be.rejectedWith(/Plugin missing: "bar"/);
      });

      it('should wrap errors thrown when loading', () => {
        const loadPluginStub = sinon.stub();

        loadPluginStub.throws();

        return resolvePluginsInOrder(['foo'], loadPluginStub)
          .should.be.rejectedWith(/Failed to load plugin "foo"/);
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
        should.exist(result);
        result.should.deep.equal([
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

        return resolvePluginsInOrder(['foo'], loadPluginStub)
          .should.be.rejectedWith(/Failed to add plugin "bar"/);
      });

      it('should allow optional dependencies by default', async () => {
        const loadPluginStub = sinon.stub();

        loadPluginStub.withArgs('foo').returns(undefined);
        loadPluginStub.withArgs('bar').returns('abc123');

        const result = await resolvePluginsInOrder(['foo?', 'bar'], loadPluginStub, true);
        should.exist(result);
        result.should.deep.equal([false, 'abc123']);
      });

      it('should be possible to prohibit optional dependencies', () => {
        const loadPluginStub = sinon.stub();

        loadPluginStub.withArgs('foo').returns(undefined);
        loadPluginStub.withArgs('bar').returns('abc123');

        return resolvePluginsInOrder(['foo?', 'bar'], loadPluginStub)
          .should.be.rejectedWith(/Plugin missing: "foo\?"/);
      });
    });
  });
});
