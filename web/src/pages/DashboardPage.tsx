import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchDashboardStats, searchParamsFromFilters } from '../api';
import ActivityChart from '../components/dashboard/ActivityChart';
import FrameworkDonut from '../components/dashboard/FrameworkDonut';
import MeshBackground from '../components/dashboard/MeshBackground';
import PassRateGauge from '../components/dashboard/PassRateGauge';
import ProjectPassBars from '../components/dashboard/ProjectPassBars';
import StatTile from '../components/dashboard/StatTile';
import ProjectCard from '../components/ProjectCard';
import { usePageTitle } from '../hooks/usePageTitle';
import type { StatsResponse } from '@shared/types';
import '../styles/dashboard.css';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function IconRuns() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" strokeLinecap="round" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 12h6M9 16h4" strokeLinecap="round" />
    </svg>
  );
}

function IconProjects() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" strokeLinejoin="round" />
    </svg>
  );
}

function IconPass() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconFail() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
    </svg>
  );
}

export default function DashboardPage() {
  usePageTitle('Dashboard');
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchDashboardStats(controller.signal)
      .then(setStats)
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      });
    return () => controller.abort();
  }, []);

  if (error) {
    return <div className="error" role="alert">{error}</div>;
  }

  if (!stats) {
    return (
      <div className="dashboard-canvas">
        <MeshBackground />
        <div className="dashboard-loading" role="status" aria-live="polite">
          <div className="dashboard-loading__ring" />
          Loading dashboard…
        </div>
      </div>
    );
  }

  const projectSummaries = stats.projectSummaries ?? [];
  const failingProjects = projectSummaries.filter((p) => p.lastRun.failed > 0).length;

  return (
    <div className="dashboard-canvas">
      <MeshBackground />

      <div className="dashboard-content">
        <header className="dash-hero dash-reveal">
          <div className="dash-hero__text">
            <p className="dash-hero__eyebrow">Snapline Hub · Live overview</p>
            <h1>Test intelligence</h1>
            <p>
              {stats.totalRuns} runs · {projectSummaries.length} projects ·{' '}
              {stats.passRate}% suite pass rate
            </p>
          </div>
          <div className="dash-hero__actions">
            <Link to="/reports" className="btn btn-glass">All runs</Link>
            <Link to="/upload" className="btn btn-primary">Import</Link>
          </div>
        </header>

        <div className="dash-bento">
          <section className="glass-card dash-bento__gauge dash-reveal" style={{ animationDelay: '60ms' }}>
            <h2 className="glass-card__title">Health score</h2>
            <PassRateGauge
              passRate={stats.passRate}
              passed={stats.totalPassed}
              failed={stats.totalFailed}
            />
          </section>

          <section className="glass-card dash-bento__stats dash-reveal" style={{ animationDelay: '100ms' }}>
            <h2 className="glass-card__title">At a glance</h2>
            <div className="dash-stat-grid">
              <StatTile label="Total runs" value={stats.totalRuns} tone="accent" icon={<IconRuns />} delay={120} />
              <StatTile label="Projects" value={projectSummaries.length} icon={<IconProjects />} delay={160} />
              <StatTile label="Suites passed" value={stats.totalPassed} tone="pass" icon={<IconPass />} delay={200} />
              <StatTile label="Suites failed" value={stats.totalFailed} tone="fail" icon={<IconFail />} delay={240} />
            </div>
            {failingProjects > 0 && (
              <p className="dash-alert">
                <span className="status-pulse fail" aria-hidden />
                {failingProjects} project{failingProjects !== 1 ? 's' : ''} with failures on last run
              </p>
            )}
          </section>

          <section className="glass-card dash-bento__activity dash-reveal" style={{ animationDelay: '140ms' }}>
            <div className="glass-card__head">
              <h2 className="glass-card__title">Run velocity</h2>
              <span className="glass-card__meta">14-day trend</span>
            </div>
            <ActivityChart data={stats.runTrend ?? []} />
          </section>

          <section className="glass-card dash-bento__framework dash-reveal" style={{ animationDelay: '180ms' }}>
            <h2 className="glass-card__title">Stack mix</h2>
            <p className="glass-card__desc">Recent runs by runtime</p>
            <FrameworkDonut recentRuns={stats.recentRuns} />
          </section>

          <section className="glass-card dash-bento__projects-bar dash-reveal" style={{ animationDelay: '200ms' }}>
            <div className="glass-card__head">
              <h2 className="glass-card__title">Project pass rates</h2>
              <Link to="/reports" className="glass-card__link">View all</Link>
            </div>
            <ProjectPassBars projects={projectSummaries} limit={10} />
          </section>
        </div>

        <section className="dashboard-section">
          <div className="section-header dash-reveal" style={{ animationDelay: '220ms' }}>
            <h2>All projects</h2>
            <p className="section-desc">Latest run, duration, and pass rate per scenario.</p>
          </div>

          {projectSummaries.length === 0 ? (
            <div className="glass-card empty dash-reveal">
              No projects yet. Push reports with a <code>project</code> per scenario or{' '}
              <Link to="/upload">import JSON</Link>.
            </div>
          ) : (
            <div className="project-grid">
              {projectSummaries.map((summary, index) => (
                <ProjectCard key={summary.project} summary={summary} index={index} />
              ))}
            </div>
          )}
        </section>

        <section className="glass-card dash-recent dash-reveal" style={{ animationDelay: '260ms' }}>
          <div className="glass-card__head">
            <h2 className="glass-card__title">Latest executions</h2>
            <Link to="/reports" className="btn btn-ghost btn-sm">Browse</Link>
          </div>
          {stats.recentRuns.length === 0 ? (
            <p className="empty">No recent runs.</p>
          ) : (
            <ul className="dash-run-list">
              {stats.recentRuns.map((run, i) => (
                <li key={run.id} className="dash-run-item" style={{ animationDelay: `${300 + i * 40}ms` }}>
                  <span className={`status-pulse ${run.failed === 0 ? 'pass' : 'fail'}`} aria-hidden />
                  <div className="dash-run-item__main">
                    <Link to={`/reports/${run.id}`} className="dash-run-item__title">
                      {run.label ?? run.id.slice(0, 8)}
                    </Link>
                    {run.project && (
                      <Link
                        to={`/reports?${searchParamsFromFilters({ project: run.project }).toString()}`}
                        className="dash-run-item__project"
                      >
                        {run.project}
                      </Link>
                    )}
                  </div>
                  <div className="dash-run-item__meta">
                    <span className={run.failed === 0 ? 'text-pass' : 'text-fail'}>
                      {run.failed === 0 ? 'All passed' : `${run.failed} failed`}
                    </span>
                    <span>{formatDate(run.generatedAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
