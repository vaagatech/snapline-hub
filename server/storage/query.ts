import type { FacetItem, ReportFilters, ReportSummary, StoredReport, TestRunReport } from '../../shared/types.js';

export const MAX_SUITES = 500;
export const MAX_STEPS_PER_SUITE = 1000;
export const MAX_META_STRING = 256;
export const MAX_TAGS = 32;

export interface ReportRow {
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

export function safeJsonParse<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function normalizePagination(limit?: number, offset?: number): { limit: number; offset: number } {
  const parsedLimit = Number(limit);
  const parsedOffset = Number(offset);
  return {
    limit: Number.isFinite(parsedLimit) ? Math.min(Math.max(1, Math.floor(parsedLimit)), 200) : 50,
    offset: Number.isFinite(parsedOffset) ? Math.max(0, Math.floor(parsedOffset)) : 0,
  };
}

export function summaryFromSuites(report: TestRunReport): { total: number; passed: number; failed: number } {
  const total = report.suites.length;
  const passed = report.suites.filter((s) => s.passed).length;
  const failed = total - passed;
  return { total, passed, failed };
}

export function parseTags(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === 'string') : [];
  } catch {
    return [];
  }
}

export function normalizeTags(tags?: string[]): string[] {
  if (!tags?.length) return [];
  return [...new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean))].sort();
}

export function rowToSummary(row: ReportRow): ReportSummary {
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

export function rowToStored(row: ReportRow): StoredReport | undefined {
  const report = safeJsonParse<TestRunReport | null>(row.report_json, null);
  if (!report) return undefined;
  return { ...rowToSummary(row), report };
}

export interface FilterClause {
  whereSql: string;
  params: Record<string, unknown>;
}

/** Portable WHERE clause using @named placeholders (adapted per driver). */
export function buildFilterClause(filters: ReportFilters = {}): FilterClause {
  const clauses: string[] = [];
  const params: Record<string, unknown> = {};

  if (filters.project) {
    clauses.push('project = @project');
    params.project = filters.project;
  } else if (filters.projects?.length) {
    const projectClauses = filters.projects.map((p, i) => {
      const key = `proj${i}`;
      params[key] = p;
      return `project = @${key}`;
    });
    clauses.push(`(${projectClauses.join(' OR ')})`);
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

  const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  return { whereSql, params };
}

export function andClause(base: FilterClause, extra: string): string {
  return base.whereSql ? `${base.whereSql} AND ${extra}` : `WHERE ${extra}`;
}

export function aggregateTagsFromRows(rows: Array<{ tags: string | null }>): FacetItem[] {
  const tagCounts = new Map<string, number>();
  for (const row of rows) {
    for (const tag of parseTags(row.tags)) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }
  return [...tagCounts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);
}

/** Convert @named SQL to positional $1, $2 for PostgreSQL. */
export function toPositionalSql(
  sql: string,
  params: Record<string, unknown>,
): { sql: string; values: unknown[] } {
  const values: unknown[] = [];
  const keys = Object.keys(params);
  let positionalSql = sql;
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i]!;
    positionalSql = positionalSql.replaceAll(`@${key}`, `$${i + 1}`);
    values.push(params[key]);
  }
  return { sql: positionalSql, values };
}
