/// <reference types="node" />

import { umzeption } from 'umzeption';
import { Umzug, memoryStorage } from 'umzug';

export async function doIt () {
  const umzug = new Umzug({
    migrations: umzeption({
      dependencies: ['./fixtures/test-dependency'],
      meta: import.meta,
      glob: ['fixtures/migrations/*.js'],
      name: 'main',
    }),
    context: {},
    storage: memoryStorage(),
    logger: console,
  });

  await umzug.up();
}
