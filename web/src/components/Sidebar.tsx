import { NavLink } from 'react-router-dom';
import PreferencesPanel from './PreferencesPanel';
import { useAuth } from '../context/AuthContext';

function IconDashboard() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  );
}

function IconRuns() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" strokeLinecap="round" />
    </svg>
  );
}

function IconUpload() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M12 16V4m0 0l-4 4m4-4l4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" strokeLinecap="round" />
    </svg>
  );
}

function IconExternal() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `nav-item${isActive ? ' active' : ''}`;

export default function Sidebar() {
  const { isAdmin, can } = useAuth();
  const showSettings = isAdmin && can('admin:settings');

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="brand-mark" aria-hidden>S</div>
        <div className="brand-text">
          <span className="brand-title">Snapline Hub</span>
          <span className="brand-sub">Test reporting</span>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Main navigation">
        <div className="nav-group">
          <span className="nav-group-label">Overview</span>
          <NavLink to="/" end className={navLinkClass}>
            <IconDashboard />
            <span>Dashboard</span>
          </NavLink>
        </div>

        <div className="nav-group">
          <span className="nav-group-label">Test results</span>
          <NavLink to="/reports" className={navLinkClass}>
            <IconRuns />
            <span>Test runs</span>
          </NavLink>
          <NavLink to="/upload" className={navLinkClass}>
            <IconUpload />
            <span>Import report</span>
          </NavLink>
          {showSettings && (
            <NavLink to="/settings" className={navLinkClass}>
              <IconSettings />
              <span>Settings</span>
            </NavLink>
          )}
        </div>
      </nav>

      <PreferencesPanel />

      <div className="sidebar-footer">
        <span className="nav-group-label">Snapline framework</span>
        <a
          href="https://vaagatech.github.io/snapline/"
          target="_blank"
          rel="noopener noreferrer"
          className="nav-external"
        >
          <span>Node.js documentation</span>
          <IconExternal />
        </a>
        <a
          href="https://vaagatech.github.io/snapline-python/"
          target="_blank"
          rel="noopener noreferrer"
          className="nav-external"
        >
          <span>Python documentation</span>
          <IconExternal />
        </a>
        <a
          href="https://vaagatech.github.io/snapline-hub/"
          target="_blank"
          rel="noopener noreferrer"
          className="nav-external"
        >
          <span>Hub documentation</span>
          <IconExternal />
        </a>
      </div>
    </aside>
  );
}
