import type { RequestHandler } from 'express';
import {
  accessibleProjects,
  loadHubAuthConfig,
  resolvePrincipal,
  type HubAuthConfig,
  type HubPrincipal,
} from '@vaagatech/snapline-hub-core';
import type { ReportFilters } from '../shared/types.js';
import type { RbacStore } from './rbac/store.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      hubPrincipal?: HubPrincipal;
      hubAuth?: HubAuthConfig;
    }
  }
}

export function createAuthMiddleware(
  authConfig: HubAuthConfig,
  rbacStore: RbacStore,
): RequestHandler {
  return async (req, _res, next) => {
    try {
      const assignments = await Promise.resolve(rbacStore.listAssignments());
      const principal = resolvePrincipal(
        {
          apiKey: req.header('x-hub-api-key') ?? undefined,
          user: req.header('x-hub-user') ?? undefined,
          automation: req.header('x-hub-automation') ?? undefined,
        },
        authConfig,
        assignments,
      );
      req.hubPrincipal = principal;
      req.hubAuth = authConfig;
      next();
    } catch (err) {
      next(err);
    }
  };
}

/** Merge RBAC project scope into API filters. Returns null when access is denied. */
export function applyRbacToFilters(
  principal: HubPrincipal | undefined,
  rbacEnabled: boolean,
  filters: ReportFilters,
): ReportFilters | null {
  if (!rbacEnabled || !principal) return filters;
  if (principal.isAdmin) return filters;

  const access = accessibleProjects(principal);
  if (access === '*') return filters;
  if (access.length === 0) return null;

  if (filters.project) {
    if (!access.includes(filters.project)) return null;
    return filters;
  }

  return { ...filters, projects: access };
}

export function loadAuthConfig(): HubAuthConfig {
  return loadHubAuthConfig(process.env);
}
