import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createSqliteRbacStore } from './sqlite.js';
import type { RbacStore } from './store.js';

export function createRbacStoreForSqlite(sqlitePath: string): RbacStore {
  mkdirSync(dirname(sqlitePath), { recursive: true });
  const db = new Database(sqlitePath);
  db.pragma('journal_mode = WAL');
  return createSqliteRbacStore(db);
}
