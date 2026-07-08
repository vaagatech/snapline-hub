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

/**
 * Common storage contract for Snapline Hub.
 * Implement this interface to plug in any database (SQL, document store, etc.).
 */
export interface ReportStore {
  /** Adapter identifier, e.g. `sqlite`, `postgres`, `dynamodb` */
  readonly driver: string;

  insertReport(report: TestRunReport, meta?: ReportIngestMeta): string | Promise<string>;
  listReports(filters?: ReportFilters): ReportSummary[] | Promise<ReportSummary[]>;
  countReports(filters?: ReportFilters): number | Promise<number>;
  aggregateStats(filters?: ReportFilters): Promise<{
    totalSuites: number;
    totalPassed: number;
    totalFailed: number;
  }> | {
    totalSuites: number;
    totalPassed: number;
    totalFailed: number;
  };
  getReport(id: string): StoredReport | undefined | Promise<StoredReport | undefined>;
  deleteReport(id: string): boolean | Promise<boolean>;
  getFacets(
    filters?: Pick<ReportFilters, 'project' | 'from' | 'to'>,
  ): ReportFacets | Promise<ReportFacets>;
  getProjectSummaries(): ProjectSummary[] | Promise<ProjectSummary[]>;
  getRunTrend(days?: number): RunTrendPoint[] | Promise<RunTrendPoint[]>;
  close(): void | Promise<void>;
}

export type StorageDriver = 'sqlite' | 'postgres' | 'custom';

export interface StorageConfig {
  /** Storage backend. Default: `sqlite` */
  driver?: StorageDriver;
  /** SQLite file path (driver: sqlite). Default: ./data/snapline-hub.db */
  sqlitePath?: string;
  /** PostgreSQL connection URL (driver: postgres) */
  databaseUrl?: string;
  /**
   * Path to a module that exports `createReportStore(config): ReportStore`
   * (driver: custom). Relative paths resolve from process.cwd().
   */
  customModule?: string;
}

/** @deprecated Use ReportStore */
export type ReportDatabase = ReportStore;
