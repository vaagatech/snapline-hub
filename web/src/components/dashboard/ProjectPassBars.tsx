import { Link } from 'react-router-dom';
import type { ProjectSummary } from '@shared/types';
import { searchParamsFromFilters } from '../../api';

interface ProjectPassBarsProps {
  projects: ProjectSummary[];
  limit?: number;
}

export default function ProjectPassBars({ projects, limit = 8 }: ProjectPassBarsProps) {
  const top = projects.slice(0, limit);
  if (!top.length) {
    return <p className="chart-empty">No project data yet.</p>;
  }

  return (
    <div className="pass-bars" role="list">
      {top.map((p, i) => (
        <Link
          key={p.project}
          to={`/reports?${searchParamsFromFilters({ project: p.project }).toString()}`}
          className="pass-bars__row dash-reveal"
          style={{ animationDelay: `${80 + i * 50}ms` }}
          role="listitem"
        >
          <span className="pass-bars__name" title={p.project}>
            {p.project}
          </span>
          <div className="pass-bars__track">
            <div
              className="pass-bars__fill"
              style={{ width: `${p.passRate}%` }}
            />
          </div>
          <span className={`pass-bars__pct ${p.passRate < 80 ? 'warn' : ''}`}>
            {p.passRate}%
          </span>
        </Link>
      ))}
    </div>
  );
}
