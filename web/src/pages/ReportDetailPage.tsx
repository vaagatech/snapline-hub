import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { DiffResult, StoredReport, TestStepResult } from '@shared/types';
import { deleteReport, fetchReport, searchParamsFromFilters } from '../api';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

function DiffView({ diff }: { diff: DiffResult }) {
  return (
    <div className="diff-block">
      <div className="diff-path">path: {diff.path}</div>
      <div className="diff-row">
        <span className="diff-label">actual</span>
        <span className="diff-actual">{JSON.stringify(diff.actual, null, 2)}</span>
      </div>
      <div className="diff-row">
        <span className="diff-label">expected</span>
        <span className="diff-expected">{JSON.stringify(diff.expected, null, 2)}</span>
      </div>
      <div className="diff-row">
        <span className="diff-label">message</span>
        <span>{diff.message}</span>
      </div>
    </div>
  );
}

function StepItem({ step }: { step: TestStepResult }) {
  return (
    <div className="step-item">
      <div className={`step-status ${step.passed ? 'pass' : 'fail'}`} />
      <div>
        <div className="step-name">{step.step}</div>
        {step.message && <div className="step-message">{step.message}</div>}
        {step.diff && <DiffView diff={step.diff} />}
      </div>
      <span className={`badge ${step.passed ? 'pass' : 'fail'}`}>
        {step.passed ? 'PASS' : 'FAIL'}
      </span>
    </div>
  );
}

function SuiteCard({ name, passed, results }: { name: string; passed: boolean; results: TestStepResult[] }) {
  const [open, setOpen] = useState(!passed);

  return (
    <div className="suite-card">
      <div className="suite-header" onClick={() => setOpen(!open)}>
        <div>
          <div className="suite-name">{name}</div>
          <div className="suite-meta">
            {results.length} step{results.length !== 1 ? 's' : ''} ·{' '}
            {results.filter((r) => r.passed).length} passed ·{' '}
            {results.filter((r) => !r.passed).length} failed
          </div>
        </div>
        <span className={`badge ${passed ? 'pass' : 'fail'}`}>
          {passed ? 'PASSED' : 'FAILED'}
        </span>
      </div>
      {open && (
        <div className="step-list">
          {results.map((step) => (
            <StepItem key={step.step} step={step} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<StoredReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchReport(id)
      .then(setReport)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load report'));
  }, [id]);

  async function handleDelete() {
    if (!id || !confirm('Delete this report permanently?')) return;
    setDeleting(true);
    try {
      await deleteReport(id);
      navigate('/reports');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
      setDeleting(false);
    }
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (!report) {
    return <div className="loading">Loading report…</div>;
  }

  const failedSteps = report.report.suites.flatMap((s) =>
    s.results.filter((r) => !r.passed),
  );

  return (
    <>
      <header className="page-header">
        <div className="toolbar" style={{ marginBottom: 0 }}>
          <div>
            <h1>{report.label ?? `Run ${report.id.slice(0, 8)}`}</h1>
            <p>
              {report.framework} · {formatDate(report.generatedAt)}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Link to="/reports" className="btn btn-ghost">← Back</Link>
            <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      </header>

      <div className="meta-grid">
        <div className="meta-item">
          <label>Project</label>
          <span>
            {report.project ? (
              <Link to={`/reports?${searchParamsFromFilters({ project: report.project }).toString()}`}>
                {report.project}
              </Link>
            ) : '—'}
          </span>
        </div>
        <div className="meta-item">
          <label>Tags</label>
          <span>
            {report.tags?.length ? (
              <span className="inline-tags">
                {report.tags.map((tag) => (
                  <Link
                    key={tag}
                    to={`/reports?${searchParamsFromFilters({ tags: [tag] }).toString()}`}
                    className="tag-chip small"
                  >
                    {tag}
                  </Link>
                ))}
              </span>
            ) : '—'}
          </span>
        </div>
        <div className="meta-item">
          <label>Framework</label>
          <span>{report.framework}</span>
        </div>
        <div className="meta-item">
          <label>Total Suites</label>
          <span>{report.total}</span>
        </div>
        <div className="meta-item">
          <label>Passed</label>
          <span className="stat-value pass" style={{ fontSize: '1.1rem' }}>{report.passed}</span>
        </div>
        <div className="meta-item">
          <label>Failed</label>
          <span className="stat-value fail" style={{ fontSize: '1.1rem' }}>{report.failed}</span>
        </div>
        <div className="meta-item">
          <label>Duration</label>
          <span>{report.durationMs ? `${report.durationMs}ms` : '—'}</span>
        </div>
        <div className="meta-item">
          <label>Executed At</label>
          <span>{formatDate(report.generatedAt)}</span>
        </div>
        <div className="meta-item">
          <label>Ingested At</label>
          <span>{report.createdAt ? formatDate(report.createdAt) : '—'}</span>
        </div>
      </div>

      {report.environment && Object.keys(report.environment).length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <h2>Environment</h2>
          </div>
          <div className="card-body" style={{ padding: '1rem 1.25rem' }}>
            <div className="meta-grid" style={{ marginBottom: 0 }}>
              {Object.entries(report.environment).map(([key, value]) => (
                <div className="meta-item" key={key}>
                  <label>{key}</label>
                  <span>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {failedSteps.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem', borderColor: 'var(--fail)' }}>
          <div className="card-header">
            <h2>Failures ({failedSteps.length})</h2>
          </div>
          <div className="card-body">
            {failedSteps.map((step) => (
              <StepItem key={step.step} step={step} />
            ))}
          </div>
        </div>
      )}

      <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Suites</h2>
      <div className="suite-list">
        {report.report.suites.map((suite) => (
          <SuiteCard
            key={suite.name}
            name={suite.name}
            passed={suite.passed}
            results={suite.results}
          />
        ))}
      </div>
    </>
  );
}
