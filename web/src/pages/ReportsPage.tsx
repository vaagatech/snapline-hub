import { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ReportFilters, ReportSummary } from '@shared/types';
import { PAGE_SIZE, fetchReports, searchParamsFromFilters } from '../api';
import ReportFiltersPanel from '../components/ReportFiltersPanel';
import { usePageTitle } from '../hooks/usePageTitle';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function TagList({ tags }: { tags: string[] }) {
  if (!tags.length) return <span className="text-muted">—</span>;
  return (
    <span className="inline-tags">
      {tags.map((tag) => (
        <Link
          key={tag}
          to={`/reports?${searchParamsFromFilters({ tags: [tag] }).toString()}`}
          className="tag-chip small"
          onClick={(e) => e.stopPropagation()}
        >
          {tag}
        </Link>
      ))}
    </span>
  );
}

export default function ReportsPage() {
  usePageTitle('Test runs');
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [activeFilters, setActiveFilters] = useState<ReportFilters>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  const loadReports = useCallback((filters: ReportFilters) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    setActiveFilters(filters);
    setOffset(filters.offset ?? 0);

    fetchReports(filters, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setReports(data.reports);
        setTotal(data.total);
        setOffset(data.offset);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'Failed to load reports');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
  }, []);

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const showingFrom = total === 0 ? 0 : offset + 1;
  const showingTo = Math.min(offset + reports.length, total);

  function goToPage(nextPage: number) {
    const nextOffset = (nextPage - 1) * PAGE_SIZE;
    loadReports({ ...activeFilters, offset: nextOffset });
  }

  return (
    <>
      <header className="page-header">
        <h1>Test runs</h1>
        <p>
          {total} run{total !== 1 ? 's' : ''} matching your filters.
          {total > PAGE_SIZE && ` Showing ${showingFrom}–${showingTo}.`}
        </p>
      </header>

      <ReportFiltersPanel onChange={loadReports} />

      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}

      <div className="toolbar">
        <Link to="/upload" className="btn btn-primary">Import report</Link>
      </div>

      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="loading" role="status" aria-live="polite">Loading reports…</div>
          ) : reports.length === 0 ? (
            <div className="empty" role="status">No reports match these filters.</div>
          ) : (
            <>
              <div className="table-scroll">
                <table className="table">
                  <thead>
                    <tr>
                      <th scope="col">Run</th>
                      <th scope="col">Project</th>
                      <th scope="col">Tags</th>
                      <th scope="col">Framework</th>
                      <th scope="col">Suites</th>
                      <th scope="col">Passed</th>
                      <th scope="col">Failed</th>
                      <th scope="col">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((run) => (
                      <tr key={run.id}>
                        <td>
                          <Link to={`/reports/${run.id}`}>
                            {run.label ?? `Run ${run.id.slice(0, 8)}`}
                          </Link>
                        </td>
                        <td>
                          {run.project ? (
                            <Link
                              to={`/reports?${searchParamsFromFilters({ project: run.project }).toString()}`}
                              className="badge neutral"
                            >
                              {run.project}
                            </Link>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td><TagList tags={run.tags} /></td>
                        <td>
                          <span className="badge neutral">{run.framework}</span>
                        </td>
                        <td>{run.total}</td>
                        <td><span className="badge pass">{run.passed}</span></td>
                        <td>
                          {run.failed > 0 ? (
                            <span className="badge fail">{run.failed}</span>
                          ) : (
                            <span className="badge pass">0</span>
                          )}
                        </td>
                        <td>{formatDate(run.generatedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <nav className="pagination" aria-label="Report pages">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={page <= 1 || loading}
                    onClick={() => goToPage(page - 1)}
                  >
                    Previous
                  </button>
                  <span className="pagination-info">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={page >= totalPages || loading}
                    onClick={() => goToPage(page + 1)}
                  >
                    Next
                  </button>
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
