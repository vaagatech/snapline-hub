import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type {
  FacetItem,
  ReportFacets,
  ReportFilters,
  ReportIngestMeta,
  ReportSummary,
  StoredReport,
  TestRunReport,
} from '../shared/types.js';

export interface ReportDatabase {
  insertReport(report: TestRunReport, meta?: ReportIngestMeta): string;
  listReports(filters?: ReportFilters): ReportSummary[];
  countReports(filters?: ReportFilters): number;
  aggregateStats(filters?: ReportFilters): {
    totalSuites: number;
    totalPassed: number;
    totalFailed: number;
  };
  getReport(id: string): StoredReport | undefined;
  deleteReport(id: string): boolean;
  getFacets(filters?: Pick<ReportFilters, 'project' | 'from' | 'to'>): ReportFacets;
  close(): void;
}

const MAX_SUITES = 500;
const MAX_STEPS_PER_SUITE = 1000;
const MAX_META_STRING = 256;
const MAX_TAGS = 32;

function safeJsonParse<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function normalizePagination(limit?: number, offset?: number): { limit: number; offset: number } {
  const parsedLimit = Number(limit);
  const parsedOffset = Number(offset);
  return {
    limit: Number.isFinite(parsedLimit) ? Math.min(Math.max(1, Math.floor(parsedLimit)), 200) : 50,
    offset: Number.isFinite(parsedOffset) ? Math.max(0, Math.floor(parsedOffset)) : 0,
  };
}

function summaryFromSuites(report: TestRunReport): { total: number; passed: number; failed: number } {
  const total = report.suites.length;
  const passed = report.suites.filter((s) => s.passed).length;
  const failed = total - passed;
  return { total, passed, failed };
}

interface ReportRow {
  id: string;
  generated_at: string;
  framework: string;
  label: string | null;
  project: string | null;
  tags: string | null;
  total: number;
  passed: number;
  failed: number;
  duration_ms: number | null;
  environment: string | null;
  report_json: string;
  created_at: string;
}

function parseTags(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === 'string') : [];
  } catch {
    return [];
  }
}

function normalizeTags(tags?: string[]): string[] {
  if (!tags?.length) return [];
  return [...new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean))].sort();
}

function rowToSummary(row: ReportRow): ReportSummary {
  return {
    id: row.id,
    generatedAt: row.generated_at,
    framework: row.framework,
    label: row.label ?? undefined,
    project: row.project ?? undefined,
    tags: parseTags(row.tags),
    total: row.total,
    passed: row.passed,
    failed: row.failed,
    durationMs: row.duration_ms ?? undefined,
    environment: row.environment ? safeJsonParse(row.environment, undefined) : undefined,
    createdAt: row.created_at,
  };
}

function rowToStored(row: ReportRow): StoredReport | undefined {
  const report = safeJsonParse<TestRunReport | null>(row.report_json, null);
  if (!report) return undefined;
  return { ...rowToSummary(row), report };
}

function buildWhereClause(filters: ReportFilters = {}): { sql: string; params: Record<string, unknown> } {
  const clauses: string[] = [];
  const params: Record<string, unknown> = {};

  if (filters.project) {
    clauses.push('project = @project');
    params.project = filters.project;
  }

  if (filters.framework) {
    clauses.push('framework = @framework');
    params.framework = filters.framework;
  }

  if (filters.status === 'passed') {
    clauses.push('failed = 0');
  } else if (filters.status === 'failed') {
    clauses.push('failed > 0');
  }

  if (filters.from) {
    clauses.push('generated_at >= @from');
    params.from = filters.from;
  }

  if (filters.to) {
    clauses.push('generated_at <= @to');
    params.to = filters.to;
  }

  if (filters.search) {
    clauses.push(
      '(label LIKE @search OR project LIKE @search OR framework LIKE @search OR tags LIKE @search)',
    );
    params.search = `%${filters.search}%`;
  }

  if (filters.tags?.length) {
    const tagClauses = filters.tags.map((tag, i) => {
      const key = `tag${i}`;
      params[key] = `%"${tag.toLowerCase()}"%`;
      return `tags LIKE @${key}`;
    });
    const joiner = filters.tagMode === 'all' ? ' AND ' : ' OR ';
    clauses.push(`(${tagClauses.join(joiner)})`);
  }

  const sql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  return { sql, params };
}

function migrateSchema(db: Database.Database): void {
  db.exec(`
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
  `);

  const columns = db.prepare('PRAGMA table_info(reports)').all() as Array<{ name: string }>;
  const names = new Set(columns.map((c) => c.name));
  if (!names.has('project')) {
    db.exec('ALTER TABLE reports ADD COLUMN project TEXT');
  }
  if (!names.has('tags')) {
    db.exec('ALTER TABLE reports ADD COLUMN tags TEXT');
  }

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_reports_generated_at ON reports(generated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_reports_framework ON reports(framework);
    CREATE INDEX IF NOT EXISTS idx_reports_project ON reports(project);
    CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);
  `);
}

export function createDatabase(dbPath: string): ReportDatabase {
  mkdirSync(dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  migrateSchema(db);

  const insertStmt = db.prepare(`
    INSERT INTO reports (
      id, generated_at, framework, label, project, tags,
      total, passed, failed, duration_ms, environment, report_json
    )
    VALUES (
      @id, @generatedAt, @framework, @label, @project, @tags,
      @total, @passed, @failed, @durationMs, @environment, @reportJson
    )
  `);

  const getStmt = db.prepare('SELECT * FROM reports WHERE id = ?');
  const deleteStmt = db.prepare('DELETE FROM reports WHERE id = ?');

  return {
    insertReport(report, meta = {}) {
      const id = crypto.randomUUID();
      const tags = normalizeTags(meta.tags);
      const suiteSummary = summaryFromSuites(report);
      insertStmt.run({
        id,
        generatedAt: report.generatedAt,
        framework: report.framework,
        label: meta.label ?? null,
        project: meta.project ?? null,
        tags: tags.length ? JSON.stringify(tags) : null,
        total: suiteSummary.total,
        passed: suiteSummary.passed,
        failed: suiteSummary.failed,
        durationMs: report.summary.durationMs ?? null,
        environment: report.environment ? JSON.stringify(report.environment) : null,
        reportJson: JSON.stringify(report),
      });
      return id;
    },

    listReports(filters = {}) {
      const { limit, offset } = normalizePagination(filters.limit, filters.offset);
      const { sql, params } = buildWhereClause(filters);
      const stmt = db.prepare(`
        SELECT * FROM reports
        ${sql}
        ORDER BY generated_at DESC
        LIMIT @limit OFFSET @offset
      `);
      const rows = stmt.all({ ...params, limit, offset }) as ReportRow[];
      return rows.map(rowToSummary);
    },

    countReports(filters = {}) {
      const { sql, params } = buildWhereClause(filters);
      const stmt = db.prepare(`SELECT COUNT(*) as count FROM reports ${sql}`);
      const row = stmt.get(params) as { count: number };
      return row.count;
    },

    aggregateStats(filters = {}) {
      const { sql, params } = buildWhereClause(filters);
      const stmt = db.prepare(`
        SELECT
          COALESCE(SUM(total), 0) as totalSuites,
          COALESCE(SUM(passed), 0) as totalPassed,
          COALESCE(SUM(failed), 0) as totalFailed
        FROM reports ${sql}
      `);
      const row = stmt.get(params) as {
        totalSuites: number;
        totalPassed: number;
        totalFailed: number;
      };
      return row;
    },

    getReport(id) {
      const row = getStmt.get(id) as ReportRow | undefined;
      return row ? rowToStored(row) : undefined;
    },

    deleteReport(id) {
      const result = deleteStmt.run(id);
      return result.changes > 0;
    },

    getFacets(filters = {}) {
      const { sql, params } = buildWhereClause(filters);
      const and = (extra: string) => (sql ? `${sql} AND ${extra}` : `WHERE ${extra}`);

      const projects = db
        .prepare(
          `SELECT project as value, COUNT(*) as count FROM reports ${and('project IS NOT NULL')} GROUP BY project ORDER BY count DESC`,
        )
        .all(params) as FacetItem[];

      const frameworks = db
        .prepare(
          `SELECT framework as value, COUNT(*) as count FROM reports ${sql} GROUP BY framework ORDER BY count DESC`,
        )
        .all(params) as FacetItem[];

      const tagRows = db
        .prepare(`SELECT tags FROM reports ${and('tags IS NOT NULL')}`)
        .all(params) as Array<{ tags: string }>;

      const tagCounts = new Map<string, number>();
      for (const row of tagRows) {
        for (const tag of parseTags(row.tags)) {
          tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
        }
      }
      const tags: FacetItem[] = [...tagCounts.entries()]
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count);

      return { projects, tags, frameworks };
    },

    close() {
      db.close();
    },
  };
}

export function validateTestRunReport(body: unknown): body is TestRunReport {
  if (!body || typeof body !== 'object') {
    return false;
  }
  const report = body as Record<string, unknown>;
  if (typeof report.generatedAt !== 'string' || typeof report.framework !== 'string') {
    return false;
  }
  if (!report.summary || typeof report.summary !== 'object') {
    return false;
  }
  const summary = report.summary as Record<string, unknown>;
  if (
    typeof summary.total !== 'number' ||
    typeof summary.passed !== 'number' ||
    typeof summary.failed !== 'number'
  ) {
    return false;
  }
  if (!Array.isArray(report.suites)) {
    return false;
  }
  if (report.suites.length > MAX_SUITES) {
    return false;
  }
  return report.suites.every((suite) => {
    if (!suite || typeof suite !== 'object') {
      return false;
    }
    const s = suite as Record<string, unknown>;
    if (!Array.isArray(s.results) || s.results.length > MAX_STEPS_PER_SUITE) {
      return false;
    }
    return typeof s.name === 'string' && typeof s.passed === 'boolean';
  });
}

export function validateIngestMeta(meta: ReportIngestMeta): string | null {
  if (meta.label && meta.label.length > MAX_META_STRING) {
    return `label exceeds ${MAX_META_STRING} characters`;
  }
  if (meta.project && meta.project.length > MAX_META_STRING) {
    return `project exceeds ${MAX_META_STRING} characters`;
  }
  if (meta.tags && meta.tags.length > MAX_TAGS) {
    return `too many tags (max ${MAX_TAGS})`;
  }
  return null;
}

export function parseIngestMeta(body: Record<string, unknown>): ReportIngestMeta {
  const meta: ReportIngestMeta = {};

  if (typeof body.label === 'string' && body.label.trim()) {
    meta.label = body.label.trim();
  }
  if (typeof body.project === 'string' && body.project.trim()) {
    meta.project = body.project.trim();
  }
  if (Array.isArray(body.tags)) {
    meta.tags = body.tags.filter((t): t is string => typeof t === 'string');
  } else if (typeof body.tags === 'string' && body.tags.trim()) {
    meta.tags = body.tags.split(',').map((t) => t.trim());
  }

  return meta;
}

export function parseReportFilters(query: Record<string, unknown>): ReportFilters {
  const filters: ReportFilters = {};

  if (typeof query.project === 'string' && query.project) {
    filters.project = query.project;
  }
  if (typeof query.framework === 'string' && query.framework) {
    filters.framework = query.framework;
  }
  if (query.status === 'passed' || query.status === 'failed') {
    filters.status = query.status;
  }
  if (typeof query.from === 'string' && query.from) {
    filters.from = query.from;
  }
  if (typeof query.to === 'string' && query.to) {
    filters.to = query.to;
  }
  if (typeof query.search === 'string' && query.search) {
    filters.search = query.search;
  }
  if (typeof query.tags === 'string' && query.tags) {
    filters.tags = query.tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
  } else if (Array.isArray(query.tags)) {
    filters.tags = query.tags
      .filter((t): t is string => typeof t === 'string')
      .map((t) => t.trim().toLowerCase());
  }
  if (query.tagMode === 'all') {
    filters.tagMode = 'all';
  }
  if (query.limit !== undefined && query.limit !== '') {
    filters.limit = Number(query.limit);
  }
  if (query.offset !== undefined && query.offset !== '') {
    filters.offset = Number(query.offset);
  }

  return filters;
}
