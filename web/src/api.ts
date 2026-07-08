import type {
  ReportFacets,
  ReportFilters,
  ReportIngestMeta,
  ReportSummary,
  StatsResponse,
  StoredReport,
  TestRunReport,
} from '@shared/types';

const API_BASE = '/api';

export type { ReportFacets, ReportFilters, StatsResponse };

export interface ReportsListResponse {
  total: number;
  limit: number;
  offset: number;
  filters: ReportFilters;
  reports: ReportSummary[];
}

function toQueryString(filters: ReportFilters): string {
  const params = new URLSearchParams();
  if (filters.project) params.set('project', filters.project);
  if (filters.framework) params.set('framework', filters.framework);
  if (filters.status) params.set('status', filters.status);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.search) params.set('search', filters.search);
  if (filters.tags?.length) params.set('tags', filters.tags.join(','));
  if (filters.tagMode === 'all') params.set('tagMode', 'all');
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.offset) params.set('offset', String(filters.offset));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${response.status}`);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export function fetchStats(filters: ReportFilters = {}): Promise<StatsResponse> {
  return request<StatsResponse>(`/stats${toQueryString(filters)}`);
}

export function fetchFacets(filters: Pick<ReportFilters, 'project' | 'from' | 'to'> = {}): Promise<ReportFacets> {
  return request<ReportFacets>(`/facets${toQueryString(filters)}`);
}

export function fetchReports(filters: ReportFilters = {}): Promise<ReportsListResponse> {
  return request<ReportsListResponse>(`/reports${toQueryString({ limit: 200, ...filters })}`);
}

export function fetchReport(id: string): Promise<StoredReport> {
  return request<StoredReport>(`/reports/${id}`);
}

export function ingestReport(
  report: TestRunReport,
  meta: ReportIngestMeta = {},
): Promise<{ id: string; url: string }> {
  return request('/reports', {
    method: 'POST',
    body: JSON.stringify({ ...report, ...meta }),
  });
}

export function deleteReport(id: string): Promise<void> {
  return request(`/reports/${id}`, { method: 'DELETE' });
}

export function filtersFromSearchParams(params: URLSearchParams): ReportFilters {
  const filters: ReportFilters = {};
  const project = params.get('project');
  const framework = params.get('framework');
  const status = params.get('status');
  const from = params.get('from');
  const to = params.get('to');
  const search = params.get('search');
  const tags = params.get('tags');
  const tagMode = params.get('tagMode');

  if (project) filters.project = project;
  if (framework) filters.framework = framework;
  if (status === 'passed' || status === 'failed') filters.status = status;
  if (from) filters.from = from;
  if (to) filters.to = to;
  if (search) filters.search = search;
  if (tags) filters.tags = tags.split(',').filter(Boolean);
  if (tagMode === 'all') filters.tagMode = 'all';

  return filters;
}

export function searchParamsFromFilters(filters: ReportFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.project) params.set('project', filters.project);
  if (filters.framework) params.set('framework', filters.framework);
  if (filters.status) params.set('status', filters.status);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.search) params.set('search', filters.search);
  if (filters.tags?.length) params.set('tags', filters.tags.join(','));
  if (filters.tagMode === 'all') params.set('tagMode', 'all');
  return params;
}
