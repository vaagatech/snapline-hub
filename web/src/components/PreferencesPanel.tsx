import { usePreferences, type FontPreference, type ThemePreference } from '../hooks/usePreferences';

export default function PreferencesPanel() {
  const { theme, font, setTheme, setFont } = usePreferences();

  return (
    <div className="preferences-panel">
      <span className="nav-group-label">Appearance</span>
      <label className="pref-field">
        <span>Theme</span>
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value as ThemePreference)}
          aria-label="Color theme"
        >
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>
      <label className="pref-field">
        <span>Font</span>
        <select
          value={font}
          onChange={(e) => setFont(e.target.value as FontPreference)}
          aria-label="Font family"
        >
          <option value="system">System default</option>
          <option value="serif">Serif</option>
          <option value="mono">Monospace</option>
        </select>
      </label>
    </div>
  );
}
