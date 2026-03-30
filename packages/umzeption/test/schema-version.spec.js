import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { computeSchemaChecksum } from '../index.js';

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const fixturesDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');

describe('computeSchemaChecksum', () => {
  it('should return a hex string', async () => {
    const checksum = await computeSchemaChecksum([{
      glob: ['migrations/*.js'],
      name: 'test',
      pluginDir: fixturesDir,
    }]);

    assert.match(checksum, /^[a-f0-9]{64}$/);
  });

  it('should return consistent checksums for the same definitions', async () => {
    const definitions = [{
      glob: ['migrations/*.js'],
      name: 'test',
      pluginDir: fixturesDir,
    }];

    const checksum1 = await computeSchemaChecksum(definitions);
    const checksum2 = await computeSchemaChecksum(definitions);

    assert.equal(checksum1, checksum2);
  });

  it('should return different checksums for different definitions', async () => {
    const checksum1 = await computeSchemaChecksum([{
      glob: ['migrations/*.js'],
      name: 'test',
      pluginDir: fixturesDir,
    }]);

    const checksum2 = await computeSchemaChecksum([{
      glob: ['migrations/*.js'],
      name: 'other',
      pluginDir: fixturesDir,
    }]);

    assert.notEqual(checksum1, checksum2);
  });

  it('should handle empty definitions', async () => {
    const checksum = await computeSchemaChecksum([]);

    assert.match(checksum, /^[a-f0-9]{64}$/);
  });

  it('should handle definitions with no matching files', async () => {
    const checksum = await computeSchemaChecksum([{
      glob: ['nonexistent/*.js'],
      name: 'test',
      pluginDir: fixturesDir,
    }]);

    assert.match(checksum, /^[a-f0-9]{64}$/);
  });

  it('should handle noPrefix option', async () => {
    const withPrefix = await computeSchemaChecksum([{
      glob: ['migrations/*.js'],
      name: 'test',
      pluginDir: fixturesDir,
    }]);

    const withNoPrefix = await computeSchemaChecksum([{
      glob: ['migrations/*.js'],
      name: 'test',
      noPrefix: true,
      pluginDir: fixturesDir,
    }]);

    // With prefix: "test|foo-01.js", without prefix: "foo-01.js"
    assert.notEqual(withPrefix, withNoPrefix);
  });

  it('should produce order-independent checksums (names are sorted)', async () => {
    const depDir = path.resolve(fixturesDir, 'test-dependency');

    // Two definitions in order A, B
    const checksum1 = await computeSchemaChecksum([
      { glob: ['migrations/*.js'], name: 'aaa', pluginDir: fixturesDir },
      { glob: ['migrations/*.js'], name: 'zzz', pluginDir: depDir },
    ]);

    // Same definitions in order B, A
    const checksum2 = await computeSchemaChecksum([
      { glob: ['migrations/*.js'], name: 'zzz', pluginDir: depDir },
      { glob: ['migrations/*.js'], name: 'aaa', pluginDir: fixturesDir },
    ]);

    assert.equal(checksum1, checksum2);
  });
});
