import type { ReactNode } from 'react';

export interface HubClientConfig {
  apiBase: string;
  apiKey?: string;
  user?: string;
  automation?: string;
}

export interface HubAppProps extends Partial<HubClientConfig> {
  /** React Router basename when embedding under a sub-path, e.g. `/reports` */
  basename?: string;
  children?: ReactNode;
}

export declare function HubApp(props: HubAppProps): JSX.Element;
export declare function configureHubClient(partial: Partial<HubClientConfig>): void;
export declare function getHubClientConfig(): HubClientConfig;
export declare function AuthProvider(props: { children: ReactNode }): JSX.Element;
export declare function useAuth(): {
  me: {
    id: string;
    type: string;
    displayName: string;
    isAdmin: boolean;
    rbacEnabled: boolean;
    permissions: string[];
    accessibleProjects: string[] | '*';
  } | null;
  loading: boolean;
  error: string | null;
  can: (permission: string) => boolean;
  isAdmin: boolean;
  refresh: () => void;
};

export default HubApp;
