import { Link } from 'react-router-dom';
import type { ProjectSummary } from '@shared/types';
import { searchParamsFromFilters } from '../api';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(ms?: number): string {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function ProjectCard({
  summary,
  index = 0,
}: {
  summary: ProjectSummary;
  index?: number;
}) {
  const { project, totalRuns, passRate, lastRun } = summary;
  const lastPassed = lastRun.failed === 0;

  return (
    <Link
      to={`/reports?${searchParamsFromFilters({ project }).toString()}`}
      className="project-card glass-card dash-reveal"
      style={{ animationDelay: `${120 + index * 40}ms` }}
    >
      <div className="project-card__glow" aria-hidden />
      <div className="project-card-header">
        <div className="project-card__status">
          <span className={`status-pulse ${lastPassed ? 'pass' : 'fail'}`} aria-hidden />
          <h3 className="project-card-title">{project}</h3>
        </div>
        <span className={`badge ${lastPassed ? 'pass' : 'fail'}`}>
          {lastPassed ? 'Pass' : 'Fail'}
        </span>
      </div>

      <div className="project-card__rate-bar" aria-hidden>
        <div className="project-card__rate-fill" style={{ width: `${passRate}%` }} />
      </div>
      <p className="project-card-subtitle">
        {passRate}% pass · {totalRuns} run{totalRuns !== 1 ? 's' : ''}
      </p>

      <div className="project-card-visual">
        <div className="project-card-ring" style={{ '--pct': `${passRate}%` } as React.CSSProperties}>
          <span>{passRate}%</span>
        </div>
        <div className="project-card-metrics">
          <div>
            <span className="metric-label">Last run</span>
            <span className="metric-value">{formatDate(lastRun.generatedAt)}</span>
          </div>
          <div>
            <span className="metric-label">Suites</span>
            <span className="metric-value">{lastRun.passed}/{lastRun.total}</span>
          </div>
          <div>
            <span className="metric-label">Duration</span>
            <span className="metric-value">{formatDuration(lastRun.durationMs)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
