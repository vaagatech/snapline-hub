import { describe, expect, it } from 'vitest';
import {
  hasPermission,
  loadHubAuthConfig,
  resolvePrincipal,
  type RbacAssignment,
} from './rbac.js';

describe('snapline-hub-core RBAC', () => {
  it('enables RBAC when admins are configured', () => {
    const config = loadHubAuthConfig({ HUB_ADMINS: 'admin@local' });
    expect(config.rbacEnabled).toBe(true);
  });

  it('grants admin all permissions', () => {
    const config = loadHubAuthConfig({ HUB_ADMINS: 'admin@local' });
    const principal = resolvePrincipal({ user: 'admin@local' }, config, []);
    expect(principal.isAdmin).toBe(true);
    expect(hasPermission(principal, 'admin:settings')).toBe(true);
    expect(hasPermission(principal, 'reports:write', 'any-project')).toBe(true);
  });

  it('scopes viewer to assigned project', () => {
    const config = loadHubAuthConfig({ HUB_RBAC_ENABLED: 'true' });
    const assignments: RbacAssignment[] = [{
      id: '1',
      principal: 'user:viewer@co.com',
      project: 'project-graphql',
      role: 'viewer',
      createdAt: '',
    }];
    const principal = resolvePrincipal({ user: 'viewer@co.com' }, config, assignments);
    expect(hasPermission(principal, 'reports:read', 'project-graphql')).toBe(true);
    expect(hasPermission(principal, 'reports:read', 'other')).toBe(false);
    expect(hasPermission(principal, 'reports:write', 'project-graphql')).toBe(false);
  });

  it('maps automation API keys from env JSON', () => {
    const config = loadHubAuthConfig({
      HUB_RBAC_ENABLED: 'true',
      HUB_RBAC_API_KEYS: JSON.stringify({
        keys: {
          'ci-key': { role: 'automation', projects: ['*'], label: 'CI' },
        },
      }),
    });
    const principal = resolvePrincipal({ apiKey: 'ci-key' }, config, []);
    expect(hasPermission(principal, 'reports:write', 'any')).toBe(true);
    expect(hasPermission(principal, 'reports:delete', 'any')).toBe(false);
  });
});
