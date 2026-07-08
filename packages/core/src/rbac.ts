/** Snapline Hub RBAC — roles, permissions, and principal resolution. */

export type HubRole = 'admin' | 'project_admin' | 'viewer' | 'automation';

export type HubPermission =
  | 'reports:read'
  | 'reports:write'
  | 'reports:delete'
  | 'admin:rbac'
  | 'admin:settings';

export interface RbacAssignment {
  id: string;
  /** e.g. apikey:ci-bot, user:alice@co.com, automation:deploy-script */
  principal: string;
  /** Omit or * for all projects */
  project?: string;
  role: HubRole;
  label?: string;
  createdAt: string;
}

export interface ApiKeyConfig {
  role: HubRole;
  /** Project ids; use "*" for all */
  projects: string[];
  label?: string;
}

export interface HubAuthConfig {
  rbacEnabled: boolean;
  /** Admin user ids (user:email or plain email) */
  admins: string[];
  /** API keys with global admin */
  adminApiKeys: Set<string>;
  /** API key -> role config from env JSON */
  apiKeys: Map<string, ApiKeyConfig>;
  /** Allow unauthenticated read (viewer) on all projects */
  publicRead: boolean;
}

export interface HubPrincipal {
  id: string;
  type: 'admin' | 'api_key' | 'user' | 'anonymous';
  displayName: string;
  isAdmin: boolean;
  assignments: RbacAssignment[];
}

const ROLE_PERMISSIONS: Record<HubRole, HubPermission[]> = {
  admin: ['reports:read', 'reports:write', 'reports:delete', 'admin:rbac', 'admin:settings'],
  project_admin: ['reports:read', 'reports:write', 'reports:delete'],
  viewer: ['reports:read'],
  automation: ['reports:read', 'reports:write'],
};

export function permissionsForRole(role: HubRole): HubPermission[] {
  return ROLE_PERMISSIONS[role];
}

export function parseApiKeysJson(raw: string | undefined): Map<string, ApiKeyConfig> {
  const map = new Map<string, ApiKeyConfig>();
  if (!raw?.trim()) return map;
  try {
    const parsed = JSON.parse(raw) as { keys?: Record<string, ApiKeyConfig> };
    if (parsed.keys) {
      for (const [key, cfg] of Object.entries(parsed.keys)) {
        if (cfg?.role && Array.isArray(cfg.projects)) {
          map.set(key, cfg);
        }
      }
    }
  } catch {
    // ignore invalid JSON
  }
  return map;
}

export function loadHubAuthConfig(env: NodeJS.ProcessEnv = process.env): HubAuthConfig {
  const admins = (env.HUB_ADMINS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .map((s) => (s.startsWith('user:') ? s : `user:${s}`));

  const adminApiKeys = new Set(
    (env.HUB_ADMIN_API_KEYS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );

  const apiKeys = parseApiKeysJson(env.HUB_RBAC_API_KEYS);
  const rbacEnabled =
    env.HUB_RBAC_ENABLED === 'true' ||
    env.HUB_RBAC_ENABLED === '1' ||
    admins.length > 0 ||
    adminApiKeys.size > 0 ||
    apiKeys.size > 0;

  return {
    rbacEnabled,
    admins,
    adminApiKeys,
    apiKeys,
    publicRead: env.HUB_PUBLIC_READ === 'true' || env.HUB_PUBLIC_READ === '1',
  };
}

function normalizePrincipalId(raw: string): string {
  const lower = raw.trim().toLowerCase();
  if (lower.includes(':')) return lower;
  return `user:${lower}`;
}

export function resolvePrincipal(
  headers: {
    apiKey?: string;
    user?: string;
    automation?: string;
  },
  config: HubAuthConfig,
  dbAssignments: RbacAssignment[] = [],
): HubPrincipal {
  const apiKey = headers.apiKey?.trim();
  const userHeader = headers.user?.trim();
  const automation = headers.automation?.trim();

  if (apiKey && config.adminApiKeys.has(apiKey)) {
    return {
      id: `apikey:${apiKey.slice(0, 8)}…`,
      type: 'admin',
      displayName: 'Admin (API key)',
      isAdmin: true,
      assignments: [],
    };
  }

  if (userHeader) {
    const principalId = normalizePrincipalId(userHeader);
    if (config.admins.includes(principalId)) {
      return {
        id: principalId,
        type: 'admin',
        displayName: userHeader,
        isAdmin: true,
        assignments: dbAssignments.filter((a) => a.principal === principalId),
      };
    }
  }

  const assignments: RbacAssignment[] = [...dbAssignments];

  if (apiKey) {
    const keyCfg = config.apiKeys.get(apiKey);
    if (keyCfg) {
      const principalId = `apikey:${apiKey.slice(0, 12)}`;
      for (const project of keyCfg.projects) {
        assignments.push({
          id: `env:${apiKey.slice(0, 8)}:${project}`,
          principal: principalId,
          project: project === '*' ? undefined : project,
          role: keyCfg.role,
          label: keyCfg.label ?? 'API key (env)',
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  if (automation) {
    const principalId = `automation:${automation.toLowerCase()}`;
    const autoAssignments = dbAssignments.filter((a) => a.principal === principalId);
    assignments.push(...autoAssignments);
    if (autoAssignments.length === 0 && apiKey && config.apiKeys.has(apiKey)) {
      // covered above
    }
  }

  if (apiKey && assignments.some((a) => a.principal.startsWith('apikey:'))) {
    return {
      id: `apikey:${apiKey.slice(0, 8)}…`,
      type: 'api_key',
      displayName: 'API key',
      isAdmin: false,
      assignments,
    };
  }

  if (userHeader) {
    const principalId = normalizePrincipalId(userHeader);
    const userAssignments = assignments.filter((a) => a.principal === principalId);
    if (userAssignments.length > 0) {
      return {
        id: principalId,
        type: 'user',
        displayName: userHeader,
        isAdmin: false,
        assignments: userAssignments,
      };
    }
  }

  return {
    id: 'anonymous',
    type: 'anonymous',
    displayName: 'Anonymous',
    isAdmin: false,
    assignments: config.publicRead
      ? [{ id: 'public', principal: 'anonymous', role: 'viewer', label: 'Public read', createdAt: '' }]
      : [],
  };
}

export function hasPermission(
  principal: HubPrincipal,
  permission: HubPermission,
  project?: string,
): boolean {
  if (principal.isAdmin) return true;

  for (const assignment of principal.assignments) {
    const perms = permissionsForRole(assignment.role);
    if (!perms.includes(permission)) continue;

    if (!project) return true;
    if (!assignment.project || assignment.project === '*') return true;
    if (assignment.project === project) return true;
  }

  return false;
}

export function accessibleProjects(principal: HubPrincipal): string[] | '*' {
  if (principal.isAdmin) return '*';

  const projects = new Set<string>();
  let hasGlobal = false;

  for (const a of principal.assignments) {
    if (!a.project || a.project === '*') {
      hasGlobal = true;
      break;
    }
    projects.add(a.project);
  }

  return hasGlobal ? '*' : [...projects];
}
