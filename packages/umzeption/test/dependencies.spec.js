import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { processDependency } from '../lib/dependencies.js';

const context = Object.freeze({ pluginDir: 'bar/foo.js', normalizedPluginName: 'foo' });

const getBasicDependency = () => ({
  glob: [],
  async installSchema () {},
});

describe('Dependencies', () => {
  describe('processDependency()', () => {
    it('should throw on a non-object definition', () => {
      assert.throws(() => { processDependency(undefined, context); }, {
        name: 'TypeError',
        message: 'Invalid umzeption definition, expected an object',
      });
      // eslint-disable-next-line unicorn/no-null
      assert.throws(() => { processDependency(null, context); }, {
        name: 'TypeError',
        message: 'Invalid umzeption definition, expected an object',
      });
      assert.throws(() => { processDependency('test', context); }, {
        name: 'TypeError',
        message: 'Invalid umzeption definition, expected an object',
      });
      assert.throws(() => { processDependency(() => 'test', context); }, {
        name: 'TypeError',
        message: 'Invalid umzeption definition, expected an object',
      });
    });

    it('should throw on an invalid object definition', () => {
      assert.throws(() => { processDependency({ name: 123 }, context); }, {
        name: 'Error',
        message: 'Invalid plugin definition',
      });
      assert.throws(() => { processDependency({ dependencies: 123 }, context); }, {
        name: 'Error',
        message: 'Invalid plugin definition',
      });
      assert.throws(() => { processDependency({ name: undefined }, context); }, {
        name: 'Error',
        message: 'Invalid plugin definition',
      });
      assert.throws(() => { processDependency({ dependencies: undefined }, context); }, {
        name: 'Error',
        message: 'Invalid plugin definition',
      });
    });

    it('should return an object', () => {
      const result = processDependency(getBasicDependency(), context);
      assert.ok(result);
      assert(typeof result === 'object', 'processDependency returns an object');
    });

    it('should add a name if one is missing', () => {
      const input = getBasicDependency();
      const result = processDependency(input, context);
      assert.deepStrictEqual(result, {
        ...input,
        pluginDir: context.pluginDir,
        name: context.normalizedPluginName,
        installSchema: result.installSchema, // Ignore it
      });
    });

    it('should create and add a name for local definitions when one is missing', () => {
      const input = getBasicDependency();
      const result = processDependency(getBasicDependency(), {
        pluginDir: 'foo',
        normalizedPluginName: './foo/bar.js',
      });
      assert.deepStrictEqual(result, {
        ...input,
        pluginDir: 'foo',
        name: 'bar',
        installSchema: result.installSchema, // Ignore it
      });
    });

    it('should leave an already set name alone but shallow clone the definition', () => {
      const input = {
        ...getBasicDependency(),
        name: 'abc123',
        pluginDir: 'foo',
      };
      const result = processDependency(input, context);

      assert.deepStrictEqual(result, {
        ...input,
        installSchema: result.installSchema, // Ignore it
      });
      assert.notStrictEqual(result, input);
    });

    it('should leave additional properties on the definition but shallow clone it', () => {
      const input = {
        ...getBasicDependency(),
        pluginDir: 'foo',
        name: 'abc123',
        dependencies: ['foo'],
        abc: 123,
      };

      const result = processDependency(input, context);

      assert.deepStrictEqual(result, {
        ...getBasicDependency(),
        installSchema: result.installSchema, // Ignore it
        pluginDir: 'foo',
        name: 'abc123',
        dependencies: ['foo'],
        abc: 123,
      });
      assert.notStrictEqual(result, input);
    });
  });
});
