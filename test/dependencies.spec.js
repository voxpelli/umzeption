import { describe, it } from 'node:test';

import chai from 'chai';

import { processDefinition } from '../lib/dependencies.js';

const should = chai.should();

const context = Object.freeze({ filePath: 'bar/foo.js', normalizedPluginName: 'foo' });

describe('Dependencies', () => {
  describe('processDefinition()', () => {
    it('should throw on a non-object definition', () => {
      should.Throw(() => { processDefinition(undefined, context); }, Error, 'Invalid umzeption definition, expected an object');
      // eslint-disable-next-line unicorn/no-null
      should.Throw(() => { processDefinition(null, context); }, Error, 'Invalid umzeption definition, expected an object');
      should.Throw(() => { processDefinition('test', context); }, Error, 'Invalid umzeption definition, expected an object');
      should.Throw(() => { processDefinition(() => 'test', context); }, Error, 'Invalid umzeption definition, expected an object');
    });

    it('should throw on an invalid object definition', () => {
      should.Throw(() => { processDefinition({ name: 123 }, context); }, Error, 'Invalid umzeption definition');
      should.Throw(() => { processDefinition({ dependencies: 123 }, context); }, Error, 'Invalid umzeption definition');
      should.Throw(() => { processDefinition({ name: undefined }, context); }, Error, 'Invalid umzeption definition');
      should.Throw(() => { processDefinition({ dependencies: undefined }, context); }, Error, 'Invalid umzeption definition');
    });

    it('should return an object', () => {
      const result = processDefinition({}, context);
      should.exist(result);
      result.should.be.an('object');
    });

    it('should add a name if one is missing', () => {
      const result = processDefinition({}, context);
      result.should.deep.equal({
        filePath: context.filePath,
        name: context.normalizedPluginName,
      });
    });

    it('should create and add a name for local definitions when one is missing', () => {
      const result = processDefinition({}, {
        filePath: 'foo',
        normalizedPluginName: './foo/bar.js',
      });
      result.should.deep.equal({ filePath: 'foo', name: 'bar' });
    });

    it('should leave an already set name alone but shallow clone the definition', () => {
      const input = { filePath: 'foo', name: 'abc123' };
      const result = processDefinition(input, context);

      result.should.deep.equal({ filePath: 'foo', name: 'abc123' });
      result.should.not.equal(input);
    });

    it('should leave additional properties on the definition but shallow clone it', () => {
      const input = {
        filePath: 'foo',
        name: 'abc123',
        dependencies: ['foo'],
        abc: 123,
      };

      const result = processDefinition(input, context);

      result.should.deep.equal({
        filePath: 'foo',
        name: 'abc123',
        dependencies: ['foo'],
        abc: 123,
      });
      result.should.not.equal(input);
    });
  });
});
