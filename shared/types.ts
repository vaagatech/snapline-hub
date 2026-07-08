/** Shared types aligned with @vaagatech/snapline-core TestRunReport schema. */

export interface DiffResult {
  path: string;
  actual: unknown;
  expected: unknown;
  message: string;
}

export interface TestStepResult {
  step: string;
  passed: boolean;
  message?: string;
  data?: unknown;
  diff?: DiffResult | null;
  processed?: unknown;
  token?: string | null;
  source?: unknown;
  target?: unknown;
  match?: boolean;
}

export interface TestSuiteResult {
  name: string;
  passed: boolean;
  results: TestStepResult[];
}

export interface TestRunReport {
  generatedAt: string;
  framework: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    durationMs?: number;
  };
  environment?: Record<string, string>;
  suites: TestSuiteResult[];
}

/** Metadata stored alongside a report in Hub (not part of TestRunReport). */
export interface ReportIngestMeta {
  label?: string;
  /** Logical project grouping, e.g. snapline-demo, my-app-integration */
  project?: string;
  /** Searchable tags, e.g. node, python, demo, ci */
  tags?: string[];
}

export interface ReportSummary {
  id: string;
  generatedAt: string;
  framework: string;
  label?: string;
  project?: string;
  tags: string[];
  total: number;
  passed: number;
  failed: number;
  durationMs?: number;
  environment?: Record<string, string>;
  createdAt?: string;
}

export interface StoredReport extends ReportSummary {
  report: TestRunReport;
}

export interface IngestResponse {
  id: string;
  url: string;
}

export interface ReportFilters {
  project?: string;
  /** When set, restrict to these project ids (RBAC). */
  projects?: string[];
  tags?: string[];
  /** When multiple tags are selected: 'any' (default) = OR, 'all' = AND */
  tagMode?: 'any' | 'all';
  framework?: string;
  status?: 'passed' | 'failed';
  from?: string;
  to?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface FacetItem {
  value: string;
  count: number;
}

export interface ReportFacets {
  projects: FacetItem[];
  tags: FacetItem[];
  frameworks: FacetItem[];
}

export interface StatsResponse {
  totalRuns: number;
  totalSuites: number;
  totalPassed: number;
  totalFailed: number;
  passRate: number;
  frameworks: string[];
  projects: FacetItem[];
  tags: FacetItem[];
  recentRuns: ReportSummary[];
  projectSummaries: ProjectSummary[];
  runTrend: RunTrendPoint[];
}

/** Per-project rollup for the dashboard. */
export interface ProjectSummary {
  project: string;
  totalRuns: number;
  passRate: number;
  lastRun: ReportSummary;
}

export interface RunTrendPoint {
  date: string;
  passed: number;
  failed: number;
  total: number;
}

export interface AuthMeResponse {
  id: string;
  type: string;
  displayName: string;
  isAdmin: boolean;
  rbacEnabled: boolean;
  permissions: string[];
  accessibleProjects: string[] | '*';
}
