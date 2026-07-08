/** Portable reports table DDL — works on SQLite and PostgreSQL. */
export const REPORTS_TABLE_DDL = `
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  generated_at TEXT NOT NULL,
  framework TEXT NOT NULL,
  label TEXT,
  project TEXT,
  tags TEXT,
  total INTEGER NOT NULL,
  passed INTEGER NOT NULL,
  failed INTEGER NOT NULL,
  duration_ms INTEGER,
  environment TEXT,
  report_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

export const REPORTS_INDEX_DDL = `
CREATE INDEX IF NOT EXISTS idx_reports_generated_at ON reports(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_framework ON reports(framework);
CREATE INDEX IF NOT EXISTS idx_reports_project ON reports(project);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);
`;

/** PostgreSQL uses a different default for created_at. */
export const POSTGRES_REPORTS_TABLE_DDL = `
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  generated_at TEXT NOT NULL,
  framework TEXT NOT NULL,
  label TEXT,
  project TEXT,
  tags TEXT,
  total INTEGER NOT NULL,
  passed INTEGER NOT NULL,
  failed INTEGER NOT NULL,
  duration_ms INTEGER,
  environment TEXT,
  report_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc')
);
`;
