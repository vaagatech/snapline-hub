import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { FacetItem, ProjectSummary, ReportFacets, ReportFilters, ReportIngestMeta, RunTrendPoint, TestRunReport } from '../../shared/types.js';
import {
  aggregateTagsFromRows,
  andClause,
  buildFilterClause,
  normalizePagination,
  normalizeTags,
  rowToStored,
  rowToSummary,
  summaryFromSuites,
  type ReportRow,
} from './query.js';
import { REPORTS_INDEX_DDL, REPORTS_TABLE_DDL } from './schema.js';
import { migrateRbacSchema } from '../rbac/sqlite.js';
import type { ReportStore } from './types.js';

function migrateSchema(db: Database.Database): void {
  db.exec(REPORTS_TABLE_DDL);

  const columns = db.prepare('PRAGMA table_info(reports)').all() as Array<{ name: string }>;
  const names = new Set(columns.map((c) => c.name));
  if (!names.has('project')) {
    db.exec('ALTER TABLE reports ADD COLUMN project TEXT');
  }
  if (!names.has('tags')) {
    db.exec('ALTER TABLE reports ADD COLUMN tags TEXT');
  }

  db.exec(REPORTS_INDEX_DDL);
  migrateRbacSchema(db);
}

export function createSqliteStore(sqlitePath: string): ReportStore {
  mkdirSync(dirname(sqlitePath), { recursive: true });
  const db = new Database(sqlitePath);
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
    driver: 'sqlite',

    insertReport(report: TestRunReport, meta: ReportIngestMeta = {}) {
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
      const { whereSql, params } = buildFilterClause(filters);
      const stmt = db.prepare(`
        SELECT * FROM reports
        ${whereSql}
        ORDER BY generated_at DESC
        LIMIT @limit OFFSET @offset
      `);
      const rows = stmt.all({ ...params, limit, offset }) as ReportRow[];
      return rows.map(rowToSummary);
    },

    countReports(filters = {}) {
      const { whereSql, params } = buildFilterClause(filters);
      const stmt = db.prepare(`SELECT COUNT(*) as count FROM reports ${whereSql}`);
      const row = stmt.get(params) as { count: number };
      return row.count;
    },

    aggregateStats(filters = {}) {
      const { whereSql, params } = buildFilterClause(filters);
      const stmt = db.prepare(`
        SELECT
          COALESCE(SUM(total), 0) as totalSuites,
          COALESCE(SUM(passed), 0) as totalPassed,
          COALESCE(SUM(failed), 0) as totalFailed
        FROM reports ${whereSql}
      `);
      return stmt.get(params) as {
        totalSuites: number;
        totalPassed: number;
        totalFailed: number;
      };
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
      const clause = buildFilterClause(filters);

      const projects = db
        .prepare(
          `SELECT project as value, COUNT(*) as count FROM reports ${andClause(clause, 'project IS NOT NULL')} GROUP BY project ORDER BY count DESC`,
        )
        .all(clause.params) as FacetItem[];

      const frameworks = db
        .prepare(
          `SELECT framework as value, COUNT(*) as count FROM reports ${clause.whereSql} GROUP BY framework ORDER BY count DESC`,
        )
        .all(clause.params) as FacetItem[];

      const tagRows = db
        .prepare(`SELECT tags FROM reports ${andClause(clause, 'tags IS NOT NULL')}`)
        .all(clause.params) as Array<{ tags: string }>;

      return {
        projects,
        tags: aggregateTagsFromRows(tagRows),
        frameworks,
      } satisfies ReportFacets;
    },

    getProjectSummaries() {
      const rows = db
        .prepare(`
          WITH ranked AS (
            SELECT *,
              ROW_NUMBER() OVER (PARTITION BY project ORDER BY generated_at DESC) AS rn
            FROM reports
            WHERE project IS NOT NULL
          ),
          agg AS (
            SELECT
              project,
              COUNT(*) AS total_runs,
              CAST(ROUND(100.0 * SUM(CASE WHEN failed = 0 THEN 1 ELSE 0 END) / COUNT(*)) AS INTEGER) AS pass_rate
            FROM reports
            WHERE project IS NOT NULL
            GROUP BY project
          )
          SELECT r.*, a.total_runs, a.pass_rate
          FROM ranked r
          JOIN agg a ON r.project = a.project
          WHERE r.rn = 1
          ORDER BY r.generated_at DESC
        `)
        .all() as Array<ReportRow & { total_runs: number; pass_rate: number }>;

      return rows.map((row) => ({
        project: row.project!,
        totalRuns: row.total_runs,
        passRate: row.pass_rate,
        lastRun: rowToSummary(row),
      })) satisfies ProjectSummary[];
    },

    getRunTrend(days = 14) {
      const rows = db
        .prepare(`
          SELECT
            date(generated_at) AS day,
            SUM(CASE WHEN failed = 0 THEN 1 ELSE 0 END) AS passed,
            SUM(CASE WHEN failed > 0 THEN 1 ELSE 0 END) AS failed,
            COUNT(*) AS total
          FROM reports
          WHERE date(generated_at) >= date('now', '-' || @days || ' days')
          GROUP BY day
          ORDER BY day ASC
        `)
        .all({ days }) as Array<{ day: string; passed: number; failed: number; total: number }>;

      return rows.map((row) => ({
        date: row.day,
        passed: row.passed,
        failed: row.failed,
        total: row.total,
      })) satisfies RunTrendPoint[];
    },

    close() {
      db.close();
    },
  };
}

/** @deprecated Use createSqliteStore */
export const createDatabase = createSqliteStore;
