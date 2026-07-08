import cors from 'cors';
import express from 'express';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDatabase } from './db.js';
import { createApiRouter } from './routes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_PORT = Number(process.env.PORT) || 3847;
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

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
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

  return { app, database, port };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  const dbPath = process.env.SNAPLINE_HUB_DB ?? join(process.cwd(), 'data', 'snapline-hub.db');
  const { app, port } = createApp({ dbPath });
  app.listen(port, () => {
    console.log(`Snapline Hub running at http://localhost:${port}`);
    console.log(`API: http://localhost:${port}/api/health`);
    console.log(`Database: ${dbPath}`);
  });
}
