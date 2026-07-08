import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createPostgresStore } from './postgres-adapter.js';
import { createSqliteStore } from './sqlite-adapter.js';
import type { ReportStore, StorageConfig } from './types.js';

const DEFAULT_SQLITE_PATH = join(process.cwd(), 'data', 'snapline-hub.db');

function resolveDriver(config: StorageConfig): StorageConfig['driver'] {
  if (config.driver) return config.driver;
  if (config.customModule) return 'custom';
  if (config.databaseUrl || process.env.DATABASE_URL) return 'postgres';
  return 'sqlite';
}

/**
 * Create a report storage backend from config or environment variables.
 *
 * Environment:
 * - SNAPLINE_HUB_STORAGE — `sqlite` | `postgres` | `custom` (default: sqlite)
 * - SNAPLINE_HUB_DB — SQLite file path
 * - DATABASE_URL — PostgreSQL connection string
 * - SNAPLINE_HUB_STORAGE_MODULE — path to custom adapter module
 */
export async function createReportStore(config: StorageConfig = {}): Promise<ReportStore> {
  const driver = resolveDriver(config);

  if (driver === 'postgres') {
    const databaseUrl = config.databaseUrl ?? process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('PostgreSQL storage requires DATABASE_URL or config.databaseUrl');
    }
    return createPostgresStore(databaseUrl);
  }

  if (driver === 'custom') {
    const modulePath = config.customModule ?? process.env.SNAPLINE_HUB_STORAGE_MODULE;
    if (!modulePath) {
      throw new Error('Custom storage requires SNAPLINE_HUB_STORAGE_MODULE or config.customModule');
    }
    const resolved = modulePath.startsWith('file://')
      ? modulePath
      : pathToFileURL(join(process.cwd(), modulePath)).href;
    const mod = await import(resolved) as {
      createReportStore?: (config: StorageConfig) => ReportStore | Promise<ReportStore>;
      default?: (config: StorageConfig) => ReportStore | Promise<ReportStore>;
    };
    const factory = mod.createReportStore ?? mod.default;
    if (!factory) {
      throw new Error(
        `Custom storage module must export createReportStore(config) or default(config): ${modulePath}`,
      );
    }
    return factory(config);
  }

  const sqlitePath = config.sqlitePath ?? process.env.SNAPLINE_HUB_DB ?? DEFAULT_SQLITE_PATH;
  return createSqliteStore(sqlitePath);
}

/** Synchronous factory for SQLite only (tests, local dev). */
export function createReportStoreSync(config: Pick<StorageConfig, 'sqlitePath'> = {}): ReportStore {
  const sqlitePath = config.sqlitePath ?? process.env.SNAPLINE_HUB_DB ?? DEFAULT_SQLITE_PATH;
  return createSqliteStore(sqlitePath);
}
