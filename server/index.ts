import express from 'express';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { HubAuthConfig } from '@vaagatech/snapline-hub-core';
import { createReportStore, createReportStoreSync } from './db.js';
import { createAuthMiddleware, loadAuthConfig } from './auth.js';
import { createCorsMiddleware, errorHandler } from './middleware.js';
import { createApiRouter } from './routes.js';
import { createRbacStoreForSqlite } from './rbac/factory.js';
import type { RbacStore } from './rbac/store.js';
import type { ReportStore } from './storage/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_PORT = Number(process.env.PORT) || 3847;
const DEFAULT_HOST = process.env.HOST ?? '127.0.0.1';
const DEFAULT_DB_PATH = process.env.SNAPLINE_HUB_DB ?? join(process.cwd(), 'data', 'snapline-hub.db');
const WEB_DIST = join(process.cwd(), 'web', 'dist');

export interface CreateAppOptions {
  /** @deprecated Use `store` instead */
  dbPath?: string;
  store?: ReportStore;
  rbacStore?: RbacStore;
  authConfig?: HubAuthConfig;
  port?: number;
  /** When set, serve static UI from this directory (default: web/dist if present). */
  webDist?: string;
}

export function createApp(options: CreateAppOptions = {}) {
  const port = options.port ?? DEFAULT_PORT;
  const dbPath = options.dbPath ?? DEFAULT_DB_PATH;
  const store =
    options.store ??
    createReportStoreSync({ sqlitePath: dbPath });
  const rbacStore = options.rbacStore ?? createRbacStoreForSqlite(dbPath);
  const authConfig = options.authConfig ?? loadAuthConfig();
  const app = express();

  app.use(createCorsMiddleware());
  app.use(express.json({ limit: '10mb' }));
  app.use(createAuthMiddleware(authConfig, rbacStore));
  app.use('/api', createApiRouter({ store, rbacStore }));

  const staticDir = options.webDist ?? WEB_DIST;
  if (existsSync(staticDir)) {
    app.use(express.static(staticDir));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        next();
        return;
      }
      res.sendFile(join(staticDir, 'index.html'));
    });
  }

  app.use(errorHandler);

  return { app, store, database: store, rbacStore, authConfig, port, host: DEFAULT_HOST };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

async function bootstrap(): Promise<void> {
  const store = await createReportStore();
  const dbPath = process.env.SNAPLINE_HUB_DB ?? join(process.cwd(), 'data', 'snapline-hub.db');
  const rbacStore = createRbacStoreForSqlite(dbPath);
  const authConfig = loadAuthConfig();
  const { app, port, host } = createApp({ store, rbacStore, authConfig });

  const server = app.listen(port, host, () => {
    console.log(`Snapline Hub running at http://${host}:${port}`);
    console.log(`API: http://${host}:${port}/api/health`);
    console.log(`Storage: ${store.driver}`);
    if (store.driver === 'sqlite') {
      console.log(`Database: ${dbPath}`);
    }
    if (authConfig.rbacEnabled) {
      console.log('RBAC: enabled');
      if (authConfig.admins.length) {
        console.log(`Admins: ${authConfig.admins.join(', ')}`);
      }
    } else if (process.env.HUB_API_KEY) {
      console.log('API key protection: enabled (X-Hub-Api-Key required for POST/DELETE)');
    }
  });

  function shutdown(signal: string) {
    console.log(`\n${signal} received — closing server`);
    server.close(() => {
      void Promise.resolve(store.close()).finally(() => process.exit(0));
    });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

if (isMain) {
  bootstrap().catch((err) => {
    console.error('Failed to start Snapline Hub:', err);
    process.exit(1);
  });
}
