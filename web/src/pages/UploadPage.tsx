import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TestRunReport } from '@shared/types';
import { ingestReport } from '../api';
import { usePageTitle } from '../hooks/usePageTitle';

export default function UploadPage() {
  usePageTitle('Import report');
  const navigate = useNavigate();
  const navigateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dragover, setDragover] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [project, setProject] = useState('');
  const [tags, setTags] = useState('');

  useEffect(() => {
    return () => {
      if (navigateTimerRef.current) clearTimeout(navigateTimerRef.current);
    };
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setUploading(true);
      try {
        const text = await file.text();
        const report = JSON.parse(text) as TestRunReport;
        const label = file.name.replace(/\.json$/i, '');
        const result = await ingestReport(report, {
          label,
          project: project.trim() || undefined,
          tags: tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
        });
        setToast('Report uploaded successfully');
        navigateTimerRef.current = setTimeout(() => navigate(`/reports/${result.id}`), 800);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Invalid JSON file. Expected a Snapline TestRunReport.',
        );
      } finally {
        setUploading(false);
      }
    },
    [navigate, project, tags],
  );

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragover(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function openFilePicker() {
    document.getElementById('file-input')?.click();
  }

  function onUploadKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!uploading) openFilePicker();
    }
  }

  return (
    <>
      <header className="page-header">
        <h1>Import report</h1>
        <p>
          Drop a Snapline <code>TestRunReport</code> JSON file, or select one from disk.
          Reports are also pushed automatically when <code>SNAPLINE_HUB_URL</code> is set.
        </p>
      </header>

      <div className="filters-panel" style={{ marginBottom: '1.5rem' }}>
        <div className="filters-row">
          <label className="filter-field">
            <span>Project (optional)</span>
            <input
              type="text"
              placeholder="e.g. snapline-demo, my-app"
              value={project}
              onChange={(e) => setProject(e.target.value)}
            />
          </label>
          <label className="filter-field">
            <span>Tags (optional, comma-separated)</span>
            <input
              type="text"
              placeholder="e.g. node, demo, ci"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </label>
        </div>
      </div>

      <div
        className={`upload-zone ${dragover ? 'dragover' : ''}`}
        role="button"
        tabIndex={0}
        aria-disabled={uploading}
        aria-label="Upload Snapline TestRunReport JSON file"
        onDragOver={(e) => {
          e.preventDefault();
          setDragover(true);
        }}
        onDragLeave={() => setDragover(false)}
        onDrop={onDrop}
        onClick={() => !uploading && openFilePicker()}
        onKeyDown={onUploadKeyDown}
      >
        <input
          id="file-input"
          type="file"
          accept=".json,application/json"
          className="sr-only"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = '';
          }}
        />
        <div className="upload-icon" aria-hidden>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 16V4m0 0l-4 4m4-4l4 4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" />
          </svg>
        </div>
        <h3>{uploading ? 'Uploading…' : 'Drop JSON report here'}</h3>
        <p>or click to browse · accepts TestRunReport JSON from Node.js or Python</p>
      </div>

      {error && (
        <div className="error" role="alert" style={{ marginTop: '1rem' }}>
          {error}
        </div>
      )}

      <div className="card" style={{ marginTop: '2rem' }}>
        <div className="card-header">
          <h2>Push from Snapline</h2>
        </div>
        <div className="card-body" style={{ padding: '1.25rem' }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
            Set the hub URL in your test runner environment or call the push API directly.
          </p>

          <h3 style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>Node.js</h3>
          <pre style={{
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '1rem',
            fontFamily: 'var(--mono)',
            fontSize: '0.8rem',
            overflow: 'auto',
            marginBottom: '1rem',
          }}>
{`import { buildReport, pushTestReportToHub } from '@vaagatech/snapline-core';

const report = buildReport([result], { durationMs: 1200 });
await pushTestReportToHub(report, { hubUrl: 'http://localhost:3847' });

// Or via env:
// SNAPLINE_HUB_URL=http://localhost:3847 npm run test`}
          </pre>

          <h3 style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>Python</h3>
          <pre style={{
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '1rem',
            fontFamily: 'var(--mono)',
            fontSize: '0.8rem',
            overflow: 'auto',
          }}>
{`from snapline.core import build_report, push_test_report_to_hub

report = build_report([result], {"durationMs": 1200})
push_test_report_to_hub(report, hub_url="http://localhost:3847")

# Or via env:
# SNAPLINE_HUB_URL=http://localhost:3847 uv run demo`}
          </pre>
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
