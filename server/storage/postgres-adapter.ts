import type { Pool, PoolClient } from 'pg';
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
  toPositionalSql,
  type ReportRow,
} from './query.js';
import { POSTGRES_REPORTS_TABLE_DDL, REPORTS_INDEX_DDL } from './schema.js';
import type { ReportStore } from './types.js';

async function migratePostgres(client: PoolClient): Promise<void> {
  await client.query(POSTGRES_REPORTS_TABLE_DDL);
  await client.query(REPORTS_INDEX_DDL);
}

async function queryAll<T>(
  pool: Pool,
  sql: string,
  params: Record<string, unknown>,
): Promise<T[]> {
  const { sql: positionalSql, values } = toPositionalSql(sql, params);
  const result = await pool.query(positionalSql, values);
  return result.rows as T[];
}

async function queryOne<T>(
  pool: Pool,
  sql: string,
  params: Record<string, unknown>,
): Promise<T | undefined> {
  const rows = await queryAll<T>(pool, sql, params);
  return rows[0];
}

export async function createPostgresStore(databaseUrl: string): Promise<ReportStore> {
  const { Pool } = await import('pg');
  const pool = new Pool({ connectionString: databaseUrl });

  const client = await pool.connect();
  try {
    await migratePostgres(client);
  } finally {
    client.release();
  }

  return {
    driver: 'postgres',

    async insertReport(report: TestRunReport, meta: ReportIngestMeta = {}) {
      const id = crypto.randomUUID();
      const tags = normalizeTags(meta.tags);
      const suiteSummary = summaryFromSuites(report);
      await pool.query(
        `INSERT INTO reports (
          id, generated_at, framework, label, project, tags,
          total, passed, failed, duration_ms, environment, report_json
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          id,
          report.generatedAt,
          report.framework,
          meta.label ?? null,
          meta.project ?? null,
          tags.length ? JSON.stringify(tags) : null,
          suiteSummary.total,
          suiteSummary.passed,
          suiteSummary.failed,
          report.summary.durationMs ?? null,
          report.environment ? JSON.stringify(report.environment) : null,
          JSON.stringify(report),
        ],
      );
      return id;
    },

    async listReports(filters = {}) {
      const { limit, offset } = normalizePagination(filters.limit, filters.offset);
      const { whereSql, params } = buildFilterClause(filters);
      const rows = await queryAll<ReportRow>(
        pool,
        `SELECT * FROM reports ${whereSql} ORDER BY generated_at DESC LIMIT @limit OFFSET @offset`,
        { ...params, limit, offset },
      );
      return rows.map(rowToSummary);
    },

    async countReports(filters = {}) {
      const { whereSql, params } = buildFilterClause(filters);
      const row = await queryOne<{ count: string }>(
        pool,
        `SELECT COUNT(*)::int as count FROM reports ${whereSql}`,
        params,
      );
      return Number(row?.count ?? 0);
    },

    async aggregateStats(filters = {}) {
      const { whereSql, params } = buildFilterClause(filters);
      const row = await queryOne<{
        totalsuites: number;
        totalpassed: number;
        totalfailed: number;
      }>(
        pool,
        `SELECT
          COALESCE(SUM(total), 0)::int as totalSuites,
          COALESCE(SUM(passed), 0)::int as totalPassed,
          COALESCE(SUM(failed), 0)::int as totalFailed
        FROM reports ${whereSql}`,
        params,
      );
      return {
        totalSuites: Number(row?.totalsuites ?? 0),
        totalPassed: Number(row?.totalpassed ?? 0),
        totalFailed: Number(row?.totalfailed ?? 0),
      };
    },

    async getReport(id) {
      const row = await queryOne<ReportRow>(pool, 'SELECT * FROM reports WHERE id = @id', { id });
      return row ? rowToStored(row) : undefined;
    },

    async deleteReport(id) {
      const result = await pool.query('DELETE FROM reports WHERE id = $1', [id]);
      return (result.rowCount ?? 0) > 0;
    },

    async getFacets(filters = {}) {
      const clause = buildFilterClause(filters);

      const projects = await queryAll<FacetItem>(
        pool,
        `SELECT project as value, COUNT(*)::int as count FROM reports ${andClause(clause, 'project IS NOT NULL')} GROUP BY project ORDER BY count DESC`,
        clause.params,
      );

      const frameworks = await queryAll<FacetItem>(
        pool,
        `SELECT framework as value, COUNT(*)::int as count FROM reports ${clause.whereSql} GROUP BY framework ORDER BY count DESC`,
        clause.params,
      );

      const tagRows = await queryAll<{ tags: string }>(
        pool,
        `SELECT tags FROM reports ${andClause(clause, 'tags IS NOT NULL')}`,
        clause.params,
      );

      return {
        projects,
        tags: aggregateTagsFromRows(tagRows),
        frameworks,
      } satisfies ReportFacets;
    },

    async getProjectSummaries() {
      const rows = await queryAll<ReportRow & { total_runs: number; pass_rate: number }>(
        pool,
        `WITH ranked AS (
          SELECT *,
            ROW_NUMBER() OVER (PARTITION BY project ORDER BY generated_at DESC) AS rn
          FROM reports
          WHERE project IS NOT NULL
        ),
        agg AS (
          SELECT
            project,
            COUNT(*)::int AS total_runs,
            CAST(ROUND(100.0 * SUM(CASE WHEN failed = 0 THEN 1 ELSE 0 END) / COUNT(*)) AS INTEGER) AS pass_rate
          FROM reports
          WHERE project IS NOT NULL
          GROUP BY project
        )
        SELECT r.*, a.total_runs, a.pass_rate
        FROM ranked r
        JOIN agg a ON r.project = a.project
        WHERE r.rn = 1
        ORDER BY r.generated_at DESC`,
        {},
      );

      return rows.map((row) => ({
        project: row.project!,
        totalRuns: Number(row.total_runs),
        passRate: Number(row.pass_rate),
        lastRun: rowToSummary(row),
      })) satisfies ProjectSummary[];
    },

    async getRunTrend(days = 14) {
      const rows = await queryAll<{ day: string; passed: number; failed: number; total: number }>(
        pool,
        `SELECT
          date(generated_at::timestamptz) AS day,
          SUM(CASE WHEN failed = 0 THEN 1 ELSE 0 END)::int AS passed,
          SUM(CASE WHEN failed > 0 THEN 1 ELSE 0 END)::int AS failed,
          COUNT(*)::int AS total
        FROM reports
        WHERE date(generated_at::timestamptz) >= CURRENT_DATE - (@days || ' days')::interval
        GROUP BY day
        ORDER BY day ASC`,
        { days },
      );

      return rows.map((row) => ({
        date: row.day,
        passed: Number(row.passed),
        failed: Number(row.failed),
        total: Number(row.total),
      })) satisfies RunTrendPoint[];
    },

    async close() {
      await pool.end();
    },
  };
}
