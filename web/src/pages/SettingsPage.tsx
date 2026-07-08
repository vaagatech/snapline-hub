import { useCallback, useEffect, useState } from 'react';
import type { HubRole } from '@vaagatech/snapline-hub-core';
import { useAuth } from '../context/AuthContext';
import { createRbacAssignment, deleteRbacAssignment, fetchRbacAssignments } from '../api';
import { usePageTitle } from '../hooks/usePageTitle';

interface AssignmentRow {
  id: string;
  principal: string;
  project?: string;
  role: HubRole;
  label?: string;
  createdAt: string;
}

const ROLES: HubRole[] = ['viewer', 'project_admin', 'automation', 'admin'];

export default function SettingsPage() {
  usePageTitle('Settings — RBAC');
  const { isAdmin, can, loading: authLoading } = useAuth();
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [principal, setPrincipal] = useState('');
  const [project, setProject] = useState('');
  const [role, setRole] = useState<HubRole>('viewer');
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchRbacAssignments();
      setAssignments(data.assignments as AssignmentRow[]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load RBAC');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin && can('admin:settings')) {
      void load();
    }
  }, [isAdmin, can, load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await createRbacAssignment({
        principal,
        project: project.trim() || undefined,
        role,
        label: label.trim() || undefined,
      });
      setPrincipal('');
      setProject('');
      setLabel('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add assignment');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteRbacAssignment(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  if (authLoading) {
    return <p className="muted">Loading…</p>;
  }

  if (!isAdmin || !can('admin:settings')) {
    return (
      <section className="page">
        <h1>Settings</h1>
        <p role="alert">You need admin access to manage RBAC. Configure <code>HUB_ADMINS</code> or sign in with an admin API key.</p>
      </section>
    );
  }

  return (
    <section className="page settings-page">
      <header className="page-header">
        <h1>Access control</h1>
        <p className="page-sub">
          Project-scoped roles for viewers, project admins, and automation scripts.
          Global admins are configured via <code>HUB_ADMINS</code> / <code>HUB_ADMIN_API_KEYS</code> in environment.
        </p>
      </header>

      {error && <p className="error-banner" role="alert">{error}</p>}

      <form className="card glass settings-form" onSubmit={handleAdd}>
        <h2>Add role assignment</h2>
        <div className="form-grid">
          <label>
            Principal
            <input
              required
              value={principal}
              onChange={(e) => setPrincipal(e.target.value)}
              placeholder="user:alice@co.com or automation:ci-bot"
            />
          </label>
          <label>
            Project
            <input
              value={project}
              onChange={(e) => setProject(e.target.value)}
              placeholder="project-graphql (empty = all)"
            />
          </label>
          <label>
            Role
            <select value={role} onChange={(e) => setRole(e.target.value as HubRole)}>
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </label>
          <label>
            Label
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Optional description" />
          </label>
        </div>
        <button type="submit" className="btn primary" disabled={saving}>
          {saving ? 'Saving…' : 'Add assignment'}
        </button>
      </form>

      <div className="card glass">
        <h2>Assignments</h2>
        {loading ? (
          <p className="muted">Loading assignments…</p>
        ) : assignments.length === 0 ? (
          <p className="muted">No database assignments yet. Automation keys can also be set via <code>HUB_RBAC_API_KEYS</code>.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Principal</th>
                <th>Project</th>
                <th>Role</th>
                <th>Label</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {assignments.map((row) => (
                <tr key={row.id}>
                  <td><code>{row.principal}</code></td>
                  <td>{row.project ?? <em>all</em>}</td>
                  <td>{row.role}</td>
                  <td>{row.label ?? '—'}</td>
                  <td>
                    <button type="button" className="btn ghost small" onClick={() => handleDelete(row.id)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
