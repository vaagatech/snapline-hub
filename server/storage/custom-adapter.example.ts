/**
 * Example custom storage adapter.
 *
 * Copy this file, implement ReportStore, and point Hub at it:
 *
 *   SNAPLINE_HUB_STORAGE=custom \
 *   SNAPLINE_HUB_STORAGE_MODULE=./my-storage-adapter.mjs \
 *   npm start
 *
 * Your module must export `createReportStore(config)` returning a ReportStore.
 */
import type {
  ProjectSummary,
  ReportFacets,
  ReportFilters,
  ReportIngestMeta,
  ReportSummary,
  RunTrendPoint,
  StoredReport,
  TestRunReport,
} from '../../shared/types.js';
import type { ReportStore, StorageConfig } from './types.js';

export function createReportStore(_config: StorageConfig): ReportStore {
  const reports = new Map<string, StoredReport>();

  function listMatching(filters: ReportFilters = {}): ReportSummary[] {
    let rows = [...reports.values()];
    if (filters.project) rows = rows.filter((r) => r.project === filters.project);
    if (filters.framework) rows = rows.filter((r) => r.framework === filters.framework);
    if (filters.status === 'passed') rows = rows.filter((r) => r.failed === 0);
    if (filters.status === 'failed') rows = rows.filter((r) => r.failed > 0);
    rows.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
    const offset = Math.max(0, filters.offset ?? 0);
    const limit = Math.min(filters.limit ?? 50, 200);
    return rows.slice(offset, offset + limit).map(({ report: _r, ...summary }) => summary);
  }

  return {
    driver: 'custom-example',

    insertReport(report: TestRunReport, meta: ReportIngestMeta = {}) {
      const id = crypto.randomUUID();
      const tags = meta.tags?.map((t) => t.trim().toLowerCase()).filter(Boolean) ?? [];
      const passed = report.suites.filter((s) => s.passed).length;
      const failed = report.suites.length - passed;
      const summary: ReportSummary = {
        id,
        generatedAt: report.generatedAt,
        framework: report.framework,
        label: meta.label,
        project: meta.project,
        tags,
        total: report.suites.length,
        passed,
        failed,
        durationMs: report.summary.durationMs,
        environment: report.environment,
        createdAt: new Date().toISOString(),
      };
      reports.set(id, { ...summary, report });
      return id;
    },

    listReports(filters = {}) {
      return listMatching(filters);
    },

    countReports(filters = {}) {
      return listMatching({ ...filters, limit: Number.MAX_SAFE_INTEGER, offset: 0 }).length;
    },

    aggregateStats(filters = {}) {
      const rows = listMatching({ ...filters, limit: Number.MAX_SAFE_INTEGER, offset: 0 });
      return {
        totalSuites: rows.reduce((sum, r) => sum + r.total, 0),
        totalPassed: rows.reduce((sum, r) => sum + r.passed, 0),
        totalFailed: rows.reduce((sum, r) => sum + r.failed, 0),
      };
    },

    getReport(id) {
      return reports.get(id);
    },

    deleteReport(id) {
      return reports.delete(id);
    },

    getFacets() {
      const projects = new Map<string, number>();
      const frameworks = new Map<string, number>();
      const tags = new Map<string, number>();
      for (const row of reports.values()) {
        if (row.project) projects.set(row.project, (projects.get(row.project) ?? 0) + 1);
        frameworks.set(row.framework, (frameworks.get(row.framework) ?? 0) + 1);
        for (const tag of row.tags) tags.set(tag, (tags.get(tag) ?? 0) + 1);
      }
      const toFacet = (map: Map<string, number>) =>
        [...map.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count);
      return {
        projects: toFacet(projects),
        frameworks: toFacet(frameworks),
        tags: toFacet(tags),
      } satisfies ReportFacets;
    },

    getProjectSummaries() {
      const byProject = new Map<string, StoredReport[]>();
      for (const row of reports.values()) {
        if (!row.project) continue;
        const list = byProject.get(row.project) ?? [];
        list.push(row);
        byProject.set(row.project, list);
      }
      return [...byProject.entries()]
        .map(([project, runs]) => {
          runs.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
          const last = runs[0]!;
          const passedRuns = runs.filter((r) => r.failed === 0).length;
          const { report: _r, ...lastRun } = last;
          return {
            project,
            totalRuns: runs.length,
            passRate: runs.length ? Math.round((passedRuns / runs.length) * 100) : 0,
            lastRun,
          };
        })
        .sort((a, b) => b.lastRun.generatedAt.localeCompare(a.lastRun.generatedAt));
    },

    getRunTrend(days = 14) {
      const cutoff = Date.now() - days * 86_400_000;
      const buckets = new Map<string, RunTrendPoint>();
      for (const row of reports.values()) {
        const ts = new Date(row.generatedAt).getTime();
        if (ts < cutoff) continue;
        const date = row.generatedAt.slice(0, 10);
        const bucket = buckets.get(date) ?? { date, passed: 0, failed: 0, total: 0 };
        bucket.total += 1;
        if (row.failed === 0) bucket.passed += 1;
        else bucket.failed += 1;
        buckets.set(date, bucket);
      }
      return [...buckets.values()].sort((a, b) => a.date.localeCompare(b.date));
    },

    close() {
      reports.clear();
    },
  };
}
