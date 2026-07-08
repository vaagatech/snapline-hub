import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchStats, searchParamsFromFilters, type StatsResponse } from '../api';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(ms?: number): string {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats()
      .then(setStats)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load stats'));
  }, []);

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (!stats) {
    return <div className="loading">Loading dashboard…</div>;
  }

  return (
    <>
      <header className="page-header">
        <h1>Dashboard</h1>
        <p>Overview of Snapline test execution results stored in this hub.</p>
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Runs</div>
          <div className="stat-value accent">{stats.totalRuns}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Suites Executed</div>
          <div className="stat-value">{stats.totalSuites}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Passed</div>
          <div className="stat-value pass">{stats.totalPassed}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Failed</div>
          <div className="stat-value fail">{stats.totalFailed}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pass Rate</div>
          <div className="stat-value">{stats.passRate}%</div>
        </div>
      </div>

      {(stats.projects.length > 0 || stats.tags.length > 0) && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <h2>Projects &amp; Tags</h2>
            <Link to="/reports" className="btn btn-ghost">Browse with filters</Link>
          </div>
          <div className="card-body" style={{ padding: '1.25rem' }}>
            {stats.projects.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Projects</h3>
                <div className="tag-list">
                  {stats.projects.map((p) => (
                    <Link
                      key={p.value}
                      to={`/reports?${searchParamsFromFilters({ project: p.value }).toString()}`}
                      className="tag-chip"
                    >
                      {p.value}
                      <span className="tag-count">{p.count}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {stats.tags.length > 0 && (
              <div>
                <h3 style={{ fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Tags</h3>
                <div className="tag-list">
                  {stats.tags.map((t) => (
                    <Link
                      key={t.value}
                      to={`/reports?${searchParamsFromFilters({ tags: [t.value] }).toString()}`}
                      className="tag-chip"
                    >
                      {t.value}
                      <span className="tag-count">{t.count}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2>Recent Runs</h2>
          <Link to="/reports" className="btn btn-ghost">View all</Link>
        </div>
        <div className="card-body">
          {stats.recentRuns.length === 0 ? (
            <div className="empty">
              No reports yet.{' '}
              <Link to="/upload">Upload a JSON report</Link> or push from Snapline with{' '}
              <code>SNAPLINE_HUB_URL</code>.
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Run</th>
                  <th>Project</th>
                  <th>Tags</th>
                  <th>Result</th>
                  <th>Duration</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentRuns.map((run) => (
                  <tr key={run.id}>
                    <td>
                      <Link to={`/reports/${run.id}`}>
                        {run.label ?? run.id.slice(0, 8)}
                      </Link>
                    </td>
                    <td>{run.project ?? '—'}</td>
                    <td>
                      {run.tags.length > 0 ? (
                        <span className="inline-tags">
                          {run.tags.map((tag) => (
                            <span key={tag} className="tag-chip small">{tag}</span>
                          ))}
                        </span>
                      ) : '—'}
                    </td>
                    <td>
                      {run.failed === 0 ? (
                        <span className="badge pass">All passed</span>
                      ) : (
                        <span className="badge fail">{run.failed} failed</span>
                      )}
                    </td>
                    <td>{formatDuration(run.durationMs)}</td>
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
