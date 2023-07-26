/// <reference types="node" />

import { umzeption } from '@voxpelli/node-module-template';
import { filename } from 'desm';
import { Umzug, memoryStorage } from 'umzug';

export async function doIt () {
  const umzug = new Umzug({
    migrations: umzeption({
      dependencies: ['./fixtures/test-dependency'],
      pluginDir: filename(import.meta.url),
      glob: ['fixtures/migrations/*.js'],
      name: 'main',
    }),
    context: {},
    storage: memoryStorage(),
    logger: console,
  });

  await umzug.up();
}
