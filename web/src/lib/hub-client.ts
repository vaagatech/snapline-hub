export interface HubClientConfig {
  apiBase: string;
  apiKey?: string;
  user?: string;
  automation?: string;
}

let config: HubClientConfig = { apiBase: '/api' };

export function configureHubClient(partial: Partial<HubClientConfig>): void {
  config = { ...config, ...partial };
}

export function getHubClientConfig(): HubClientConfig {
  return config;
}

export function hubAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (config.apiKey) headers['X-Hub-Api-Key'] = config.apiKey;
  if (config.user) headers['X-Hub-User'] = config.user;
  if (config.automation) headers['X-Hub-Automation'] = config.automation;
  return headers;
}
