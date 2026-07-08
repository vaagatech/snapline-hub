import express from 'express';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDatabase } from './db.js';
import { createCorsMiddleware, errorHandler } from './middleware.js';
import { createApiRouter } from './routes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_PORT = Number(process.env.PORT) || 3847;
const DEFAULT_HOST = process.env.HOST ?? '127.0.0.1';
const DEFAULT_DB_PATH = process.env.SNAPLINE_HUB_DB ?? join(process.cwd(), 'data', 'snapline-hub.db');
const WEB_DIST = join(process.cwd(), 'web', 'dist');

export interface CreateAppOptions {
  dbPath?: string;
  port?: number;
}

export function createApp(options: CreateAppOptions = {}) {
  const dbPath = options.dbPath ?? DEFAULT_DB_PATH;
  const port = options.port ?? DEFAULT_PORT;
  const app = express();
  const database = createDatabase(dbPath);

  app.use(createCorsMiddleware());
  app.use(express.json({ limit: '10mb' }));
  app.use('/api', createApiRouter(database));

  if (existsSync(WEB_DIST)) {
    app.use(express.static(WEB_DIST));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        next();
        return;
      }
      res.sendFile(join(WEB_DIST, 'index.html'));
    });
  }

  app.use(errorHandler);

  return { app, database, port, host: DEFAULT_HOST };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  const dbPath = process.env.SNAPLINE_HUB_DB ?? join(process.cwd(), 'data', 'snapline-hub.db');
  const { app, database, port, host } = createApp({ dbPath });

  const server = app.listen(port, host, () => {
    console.log(`Snapline Hub running at http://${host}:${port}`);
    console.log(`API: http://${host}:${port}/api/health`);
    console.log(`Database: ${dbPath}`);
    if (process.env.HUB_API_KEY) {
      console.log('API key protection: enabled (X-Hub-Api-Key required for POST/DELETE)');
    }
  });

  function shutdown(signal: string) {
    console.log(`\n${signal} received — closing server`);
    server.close(() => {
      database.close();
      process.exit(0);
    });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
