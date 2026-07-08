import type { ReportFilters, ReportIngestMeta, TestRunReport } from '../../shared/types.js';
import { MAX_META_STRING, MAX_STEPS_PER_SUITE, MAX_SUITES, MAX_TAGS } from './query.js';

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
