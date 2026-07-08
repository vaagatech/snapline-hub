import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ReportFilters, ReportSummary } from '@shared/types';
import { fetchReports, searchParamsFromFilters } from '../api';
import ReportFiltersPanel from '../components/ReportFiltersPanel';

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
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadReports = useCallback((filters: ReportFilters) => {
    setLoading(true);
    setError(null);
    fetchReports(filters)
      .then((data) => {
        setReports(data.reports);
        setTotal(data.total);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load reports'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // initial load handled by ReportFiltersPanel onChange
  }, []);

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <>
      <header className="page-header">
        <h1>Test runs</h1>
        <p>
          {total} run{total !== 1 ? 's' : ''} matching your filters.
          Use search and quick filters above, or open advanced filters for project, date range, and tags.
        </p>
      </header>

      <ReportFiltersPanel onChange={loadReports} />

      <div className="toolbar">
        <Link to="/upload" className="btn btn-primary">Import report</Link>
      </div>

      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="loading">Loading reports…</div>
          ) : reports.length === 0 ? (
            <div className="empty">No reports match these filters.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Run</th>
                  <th>Project</th>
                  <th>Tags</th>
                  <th>Framework</th>
                  <th>Suites</th>
                  <th>Passed</th>
                  <th>Failed</th>
                  <th>Date</th>
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
          )}
        </div>
      </div>
    </>
  );
}
