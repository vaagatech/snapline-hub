import type { ProjectSummary, ReportSummary, RunTrendPoint, StatsResponse } from '@shared/types';

export function buildProjectSummaries(reports: ReportSummary[]): ProjectSummary[] {
  const byProject = new Map<string, ReportSummary[]>();

  for (const report of reports) {
    if (!report.project) continue;
    const list = byProject.get(report.project) ?? [];
    list.push(report);
    byProject.set(report.project, list);
  }

  return [...byProject.entries()]
    .map(([project, runs]) => {
      runs.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
      const passedRuns = runs.filter((r) => r.failed === 0).length;
      return {
        project,
        totalRuns: runs.length,
        passRate: runs.length ? Math.round((passedRuns / runs.length) * 100) : 0,
        lastRun: runs[0]!,
      };
    })
    .sort((a, b) => b.lastRun.generatedAt.localeCompare(a.lastRun.generatedAt));
}

export function buildRunTrend(reports: ReportSummary[], days = 14): RunTrendPoint[] {
  const cutoff = Date.now() - days * 86_400_000;
  const buckets = new Map<string, RunTrendPoint>();

  for (const report of reports) {
    const ts = new Date(report.generatedAt).getTime();
    if (Number.isNaN(ts) || ts < cutoff) continue;
    const date = report.generatedAt.slice(0, 10);
    const bucket = buckets.get(date) ?? { date, passed: 0, failed: 0, total: 0 };
    bucket.total += 1;
    if (report.failed === 0) bucket.passed += 1;
    else bucket.failed += 1;
    buckets.set(date, bucket);
  }

  return [...buckets.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** Fill dashboard fields when connected to an older API build. */
export function enrichDashboardStats(
  stats: StatsResponse,
  reports: ReportSummary[],
): StatsResponse {
  const projectSummaries =
    stats.projectSummaries?.length ? stats.projectSummaries : buildProjectSummaries(reports);
  const runTrend = stats.runTrend?.length ? stats.runTrend : buildRunTrend(reports);

  return { ...stats, projectSummaries, runTrend };
}
