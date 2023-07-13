/// <reference types="node" />
/// <reference types="mocha" />
/// <reference types="chai" />
/// <reference types="sinon" />
/// <reference types="sinon-chai" />

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import { filename } from 'desm';
import { Umzug, memoryStorage } from 'umzug';

import { umzeption } from '../index.js';

chai.use(chaiAsPromised);
chai.use(sinonChai);

chai.should();

describe('Integration', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('main', () => {
    it('should resolve dependencies and create proper migrations', async () => {
      const context = {};
      const storage = memoryStorage();

      const umzug = new Umzug({
        migrations: umzeption({
          dependencies: ['./fixtures/test-dependency'],
          // TODO: SHould not be necessary?
          filePath: filename(import.meta.url),
          glob: ['fixtures/migrations/*.js'],
          // TODO: SHould not be necessary
          name: 'main',
        }),
        context,
        storage,
        logger: sinon.stub(console),
      });

      await umzug.up();

      const executed = await storage.executed({ context });

      executed.should.deep.equal([
        'test-dependency|foo-01.js',
        'main|foo-01.js',
      ]);
    });
  });
});
