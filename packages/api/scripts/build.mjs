import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = join(pkgRoot, '../..');
const dist = join(pkgRoot, 'dist');

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

cpSync(join(repoRoot, 'dist/server'), join(dist, 'server'), { recursive: true });
cpSync(join(repoRoot, 'dist/shared'), join(dist, 'shared'), { recursive: true });
cpSync(join(repoRoot, 'packages/core/dist'), join(dist, 'packages/core/dist'), { recursive: true });

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
