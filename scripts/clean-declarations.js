#!/usr/bin/env node

import { readdir, unlink } from 'node:fs/promises';
import path from 'node:path';

const cwd = process.cwd();

/**
 * Remove generated .d.ts files (but keep hand-authored *-types.d.ts files).
 *
 * @param {string} dir - directory to clean (relative to cwd)
 * @param {{ keepIndex?: boolean, maxDepth?: number }} [options]
 */
async function cleanDeclarations (dir, { keepIndex = false, maxDepth = 1 } = {}) {
  const fullDir = path.resolve(cwd, dir);
  /** @type {string[]} */
  let entries;
  try {
    entries = await readdir(fullDir);
  } catch {
    return; // directory doesn't exist
  }

  for (const entry of entries) {
    if (!entry.endsWith('.d.ts') && !entry.includes('.d.ts.')) continue;
    if (entry.endsWith('-types.d.ts')) continue;
    if (keepIndex && entry === 'index.d.ts') continue;

    await unlink(path.join(fullDir, entry));
  }

  if (maxDepth > 1) {
    const subEntries = await readdir(fullDir, { withFileTypes: true });
    for (const sub of subEntries) {
      if (sub.isDirectory()) {
        await cleanDeclarations(path.join(dir, sub.name), { maxDepth: maxDepth - 1 });
      }
    }
  }
}

await cleanDeclarations('.', { keepIndex: true });
await cleanDeclarations('lib', { maxDepth: 2 });
