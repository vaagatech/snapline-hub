#!/usr/bin/env node
/**
 * Sync package versions across snapline-hub workspaces.
 * Usage:
 *   node scripts/sync-versions.mjs --check
 *   node scripts/sync-versions.mjs --bump-patch
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rootPkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const version = process.env.GITHUB_REF_NAME?.replace(/^v/, '') ?? rootPkg.version;

const packagePaths = [
  'package.json',
  'packages/core/package.json',
  'packages/api/package.json',
  'packages/ui/package.json',
];

function setVersion(path, v) {
  const full = join(root, path);
  const pkg = JSON.parse(readFileSync(full, 'utf8'));
  pkg.version = v;
  if (pkg.dependencies?.['@vaagatech/snapline-hub-core']) {
    pkg.dependencies['@vaagatech/snapline-hub-core'] = v;
  }
  writeFileSync(full, `${JSON.stringify(pkg, null, 2)}\n`);
}

if (process.argv.includes('--check')) {
  for (const p of packagePaths) {
    const pkg = JSON.parse(readFileSync(join(root, p), 'utf8'));
    if (pkg.version !== version) {
      console.error(`${p} version ${pkg.version} !== tag version ${version}`);
      process.exit(1);
    }
  }
  console.log(`All packages at ${version}`);
} else if (process.argv.includes('--bump-patch')) {
  const [major, minor, patch] = rootPkg.version.split('.').map(Number);
  const next = `${major}.${minor}.${patch + 1}`;
  for (const p of packagePaths) setVersion(p, next);
  console.log(`Bumped to ${next}`);
} else {
  for (const p of packagePaths) setVersion(p, rootPkg.version);
  console.log(`Synced to ${rootPkg.version}`);
}
