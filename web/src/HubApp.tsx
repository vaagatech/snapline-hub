import { BrowserRouter } from 'react-router-dom';
import { useEffect, type ReactNode } from 'react';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { configureHubClient, type HubClientConfig } from './lib/hub-client';
import { initPreferences } from './hooks/usePreferences';
import './styles.css';

export interface HubAppProps extends Partial<HubClientConfig> {
  /** React Router basename when embedding under a sub-path, e.g. `/reports` */
  basename?: string;
  children?: ReactNode;
}

/**
 * Embeddable Snapline Hub UI — mount inside an existing React app or SPA shell.
 *
 * @example
 * ```tsx
 * import { HubApp } from '@vaagatech/snapline-hub-ui';
 *
 * <HubApp apiBase="https://hub.example.com/api" basename="/test-reports" user="alice@co.com" />
 * ```
 */
export function HubApp({
  basename = '/',
  apiBase = '/api',
  apiKey,
  user,
  automation,
  children,
}: HubAppProps) {
  useEffect(() => {
    initPreferences();
    configureHubClient({ apiBase, apiKey, user, automation });
  }, [apiBase, apiKey, user, automation]);

  return (
    <BrowserRouter basename={basename}>
      <AuthProvider>
        {children ?? <App />}
      </AuthProvider>
    </BrowserRouter>
  );
}

export { configureHubClient, getHubClientConfig } from './lib/hub-client';
export { AuthProvider, useAuth } from './context/AuthContext';
export default HubApp;
