import type {
  AuthMeResponse,
  ReportFacets,
  ReportFilters,
  ReportIngestMeta,
  ReportSummary,
  StatsResponse,
  StoredReport,
  TestRunReport,
} from '@shared/types';
import { enrichDashboardStats } from './lib/dashboard-stats';
import { getHubClientConfig, hubAuthHeaders } from './lib/hub-client';

const PAGE_SIZE = 50;

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
  const { apiBase } = getHubClientConfig();
  const response = await fetch(`${apiBase}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...hubAuthHeaders(),
      ...options?.headers,
    },
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

export function fetchStats(filters: ReportFilters = {}, signal?: AbortSignal): Promise<StatsResponse> {
  return request<StatsResponse>(`/stats${toQueryString(filters)}`, { signal });
}

/** Stats enriched with projectSummaries + runTrend (works with older API builds). */
export async function fetchDashboardStats(signal?: AbortSignal): Promise<StatsResponse> {
  const stats = await fetchStats({}, signal);
  const needsEnrichment =
    !stats.projectSummaries?.length ||
    !stats.runTrend?.length ||
    stats.projectSummaries === undefined ||
    stats.runTrend === undefined;

  if (!needsEnrichment) {
    return stats;
  }

  const list = await request<ReportsListResponse>(
    `/reports${toQueryString({ limit: 200 })}`,
    { signal },
  );

  return enrichDashboardStats(stats, list.reports);
}

export function fetchFacets(
  filters: Pick<ReportFilters, 'project' | 'from' | 'to'> = {},
  signal?: AbortSignal,
): Promise<ReportFacets> {
  return request<ReportFacets>(`/facets${toQueryString(filters)}`, { signal });
}

export function fetchReports(filters: ReportFilters = {}, signal?: AbortSignal): Promise<ReportsListResponse> {
  return request<ReportsListResponse>(
    `/reports${toQueryString({ limit: PAGE_SIZE, ...filters })}`,
    { signal },
  );
}

export function fetchReport(id: string, signal?: AbortSignal): Promise<StoredReport> {
  return request<StoredReport>(`/reports/${id}`, { signal });
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

export function fetchAuthMe(signal?: AbortSignal): Promise<AuthMeResponse> {
  return request<AuthMeResponse>('/auth/me', { signal });
}

export interface RbacAssignmentsResponse {
  assignments: Array<{
    id: string;
    principal: string;
    project?: string;
    role: string;
    label?: string;
    createdAt: string;
  }>;
}

export function fetchRbacAssignments(signal?: AbortSignal): Promise<RbacAssignmentsResponse> {
  return request<RbacAssignmentsResponse>('/admin/rbac', { signal });
}

export function createRbacAssignment(body: {
  principal: string;
  project?: string;
  role: string;
  label?: string;
}): Promise<unknown> {
  return request('/admin/rbac', { method: 'POST', body: JSON.stringify(body) });
}

export function deleteRbacAssignment(id: string): Promise<void> {
  return request(`/admin/rbac/${id}`, { method: 'DELETE' });
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
  const offset = params.get('offset');

  if (project) filters.project = project;
  if (framework) filters.framework = framework;
  if (status === 'passed' || status === 'failed') filters.status = status;
  if (from) filters.from = from;
  if (to) filters.to = to;
  if (search) filters.search = search;
  if (tags) filters.tags = tags.split(',').filter(Boolean);
  if (tagMode === 'all') filters.tagMode = 'all';
  if (offset) filters.offset = Number(offset);

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
  if (filters.offset) params.set('offset', String(filters.offset));
  return params;
}

export { PAGE_SIZE };
