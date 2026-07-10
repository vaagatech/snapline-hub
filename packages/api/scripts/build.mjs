import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = join(pkgRoot, '../..');
const dist = join(pkgRoot, 'dist');
const serverDist = join(repoRoot, 'dist/server');
const sharedDist = join(repoRoot, 'dist/shared');
const coreDist = join(repoRoot, 'packages/core/dist');

if (!existsSync(serverDist) || !existsSync(sharedDist)) {
  console.log('Building hub server (dist/server missing)…');
  execSync('npm run build:server', { cwd: repoRoot, stdio: 'inherit' });
}

if (!existsSync(coreDist)) {
  console.log('Building hub-core (packages/core/dist missing)…');
  execSync('npm run build:packages', { cwd: repoRoot, stdio: 'inherit' });
}

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

cpSync(serverDist, join(dist, 'server'), { recursive: true });
cpSync(sharedDist, join(dist, 'shared'), { recursive: true });
cpSync(coreDist, join(dist, 'packages/core/dist'), { recursive: true });

writeFileSync(
  join(dist, 'index.js'),
  `export { createApp } from './server/index.js';
export { createReportStore, createReportStoreSync } from './server/db.js';
export { loadAuthConfig, createAuthMiddleware } from './server/auth.js';
`,
);

writeFileSync(
  join(dist, 'index.d.ts'),
  `export { createApp, type CreateAppOptions } from './server/index.js';
export { createReportStore, createReportStoreSync } from './server/db.js';
export { loadAuthConfig, createAuthMiddleware } from './server/auth.js';
export type { ReportStore } from './server/storage/types.js';
export type { RbacStore } from './server/rbac/store.js';
`,
);

console.log('Built @vaagatech/snapline-hub-api dist');
