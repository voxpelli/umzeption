import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { processDefinition } from '../lib/dependencies.js';

const context = Object.freeze({ pluginDir: 'bar/foo.js', normalizedPluginName: 'foo' });

describe('Dependencies', () => {
  describe('processDefinition()', () => {
    it('should throw on a non-object definition', () => {
      assert.throws(() => { processDefinition(undefined, context); }, {
        name: 'TypeError',
        message: 'Invalid umzeption definition, expected an object',
      });
      // eslint-disable-next-line unicorn/no-null
      assert.throws(() => { processDefinition(null, context); }, {
        name: 'TypeError',
        message: 'Invalid umzeption definition, expected an object',
      });
      assert.throws(() => { processDefinition('test', context); }, {
        name: 'TypeError',
        message: 'Invalid umzeption definition, expected an object',
      });
      assert.throws(() => { processDefinition(() => 'test', context); }, {
        name: 'TypeError',
        message: 'Invalid umzeption definition, expected an object',
      });
    });

    it('should throw on an invalid object definition', () => {
      assert.throws(() => { processDefinition({ name: 123 }, context); }, {
        name: 'Error',
        message: 'Invalid umzeption definition',
      });
      assert.throws(() => { processDefinition({ dependencies: 123 }, context); }, {
        name: 'Error',
        message: 'Invalid umzeption definition',
      });
      assert.throws(() => { processDefinition({ name: undefined }, context); }, {
        name: 'Error',
        message: 'Invalid umzeption definition',
      });
      assert.throws(() => { processDefinition({ dependencies: undefined }, context); }, {
        name: 'Error',
        message: 'Invalid umzeption definition',
      });
    });

    it('should return an object', () => {
      const result = processDefinition({}, context);
      assert.ok(result);
      assert(typeof result === 'object', 'processDefinition returns an object');
    });

    it('should add a name if one is missing', () => {
      const result = processDefinition({}, context);
      assert.deepStrictEqual(result, {
        pluginDir: context.pluginDir,
        name: context.normalizedPluginName,
      });
    });

    it('should create and add a name for local definitions when one is missing', () => {
      const result = processDefinition({}, {
        pluginDir: 'foo',
        normalizedPluginName: './foo/bar.js',
      });
      assert.deepStrictEqual(result, { pluginDir: 'foo', name: 'bar' });
    });

    it('should leave an already set name alone but shallow clone the definition', () => {
      const input = { pluginDir: 'foo', name: 'abc123' };
      const result = processDefinition(input, context);

      assert.deepStrictEqual(result, { pluginDir: 'foo', name: 'abc123' });
      assert.notStrictEqual(result, input);
    });

    it('should leave additional properties on the definition but shallow clone it', () => {
      const input = {
        pluginDir: 'foo',
        name: 'abc123',
        dependencies: ['foo'],
        abc: 123,
      };

      const result = processDefinition(input, context);

      assert.deepStrictEqual(result, {
        pluginDir: 'foo',
        name: 'abc123',
        dependencies: ['foo'],
        abc: 123,
      });
      assert.notStrictEqual(result, input);
    });
  });
});
