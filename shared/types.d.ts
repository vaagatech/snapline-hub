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
export interface ReportSummary {
    id: string;
    generatedAt: string;
    framework: string;
    label?: string;
    total: number;
    passed: number;
    failed: number;
    durationMs?: number;
    environment?: Record<string, string>;
}
export interface StoredReport extends ReportSummary {
    report: TestRunReport;
}
export interface IngestResponse {
    id: string;
    url: string;
}
