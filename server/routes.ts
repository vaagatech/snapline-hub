import { Router } from 'express';
import {
  accessibleProjects,
  hasPermission,
  permissionsForRole,
  type HubPermission,
} from '@vaagatech/snapline-hub-core';
import type { TestRunReport } from '../shared/types.js';
import type { ReportStore } from './storage/types.js';
import {
  parseIngestMeta,
  parseReportFilters,
  validateIngestMeta,
  validateTestRunReport,
} from './storage/validation.js';
import { applyRbacToFilters } from './auth.js';
import { asyncHandler, requireApiKey, requirePermission } from './middleware.js';
import type { RbacStore } from './rbac/store.js';
import { createAdminRouter } from './admin-routes.js';

const MAX_BODY_BYTES = 10 * 1024 * 1024;

function collectPermissions(principal: Express.Request['hubPrincipal']): HubPermission[] {
  if (!principal) return [];
  if (principal.isAdmin) {
    return permissionsForRole('admin');
  }
  const perms = new Set<HubPermission>();
  for (const assignment of principal.assignments) {
    for (const p of permissionsForRole(assignment.role)) {
      perms.add(p);
    }
  }
  return [...perms];
}

export interface ApiRouterOptions {
  store: ReportStore;
  rbacStore: RbacStore;
}

export function createApiRouter({ store, rbacStore }: ApiRouterOptions): Router {
  const router = Router();

  router.get('/auth/me', asyncHandler(async (req, res) => {
    const principal = req.hubPrincipal!;
    const rbacEnabled = req.hubAuth?.rbacEnabled ?? false;
    res.json({
      id: principal.id,
      type: principal.type,
      displayName: principal.displayName,
      isAdmin: principal.isAdmin,
      rbacEnabled,
      permissions: collectPermissions(principal),
      accessibleProjects: principal.isAdmin ? '*' : accessibleProjects(principal),
    });
  }));

  router.use('/admin', createAdminRouter(rbacStore));

  router.get('/health', asyncHandler(async (req, res) => {
    const reports = await Promise.resolve(store.countReports());
    res.json({
      status: 'ok',
      reports,
      storage: store.driver,
      rbac: req.hubAuth?.rbacEnabled ?? false,
    });
  }));

  router.get('/facets', asyncHandler(async (req, res) => {
    const filters = parseReportFilters(req.query as Record<string, unknown>);
    const scoped = applyRbacToFilters(req.hubPrincipal, req.hubAuth?.rbacEnabled ?? false, filters);
    if (!scoped) {
      res.json({ projects: [], tags: [], frameworks: [] });
      return;
    }
    const facets = await Promise.resolve(store.getFacets({
      project: scoped.project,
      from: scoped.from,
      to: scoped.to,
    }));
    res.json(facets);
  }));

  router.get('/reports', asyncHandler(async (req, res) => {
    const filters = parseReportFilters(req.query as Record<string, unknown>);
    const scoped = applyRbacToFilters(req.hubPrincipal, req.hubAuth?.rbacEnabled ?? false, filters);
    if (!scoped) {
      res.json({ total: 0, limit: 50, offset: 0, filters, reports: [] });
      return;
    }
    const reports = await Promise.resolve(store.listReports(scoped));
    const { limit, offset } = {
      limit: Math.min(scoped.limit ?? 50, 200),
      offset: scoped.offset ?? 0,
    };
    res.json({
      total: await Promise.resolve(store.countReports(scoped)),
      limit: Number.isFinite(limit) ? Math.min(Math.max(1, limit), 200) : 50,
      offset: Number.isFinite(offset) ? Math.max(0, offset) : 0,
      filters: scoped,
      reports,
    });
  }));

  router.get('/reports/:id', asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const report = await Promise.resolve(store.getReport(id));
    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }
    if (req.hubAuth?.rbacEnabled && report.project) {
      if (!hasPermission(req.hubPrincipal!, 'reports:read', report.project)) {
        res.status(403).json({ error: 'Forbidden — insufficient permissions' });
        return;
      }
    }
    res.json(report);
  }));

  router.post(
    '/reports',
    requireApiKey(),
    requirePermission('reports:write', (req) => {
      const meta = parseIngestMeta((req.body ?? {}) as Record<string, unknown>);
      if (typeof req.query.project === 'string') meta.project = req.query.project;
      return meta.project;
    }),
    asyncHandler(async (req, res) => {
      const bodySize = JSON.stringify(req.body ?? {}).length;
      if (bodySize > MAX_BODY_BYTES) {
        res.status(413).json({ error: `Payload too large (max ${MAX_BODY_BYTES} bytes)` });
        return;
      }

      if (!validateTestRunReport(req.body)) {
        res.status(400).json({
          error: 'Invalid TestRunReport payload',
          hint: 'Expected { generatedAt, framework, summary, suites: [...] } with reasonable size limits',
        });
        return;
      }

      const payload = req.body as TestRunReport & Record<string, unknown>;
      const meta = parseIngestMeta(payload);

      if (typeof req.query.label === 'string') meta.label = req.query.label;
      if (typeof req.query.project === 'string') meta.project = req.query.project;
      if (typeof req.query.tags === 'string') {
        meta.tags = req.query.tags.split(',').map((t) => t.trim());
      }

      const metaError = validateIngestMeta(meta);
      if (metaError) {
        res.status(400).json({ error: metaError });
        return;
      }

      const { label: _l, project: _p, tags: _t, ...reportBody } = payload;
      const id = await Promise.resolve(store.insertReport(reportBody as TestRunReport, meta));
      res.status(201).json({ id, url: `/reports/${id}` });
    }),
  );

  router.delete(
    '/reports/:id',
    requireApiKey(),
    requirePermission('reports:delete'),
    asyncHandler(async (req, res) => {
      const id = String(req.params.id);
      const existing = await Promise.resolve(store.getReport(id));
      if (existing?.project && req.hubAuth?.rbacEnabled) {
        if (!hasPermission(req.hubPrincipal!, 'reports:delete', existing.project)) {
          res.status(403).json({ error: 'Forbidden — insufficient permissions' });
          return;
        }
      }
      const deleted = await Promise.resolve(store.deleteReport(id));
      if (!deleted) {
        res.status(404).json({ error: 'Report not found' });
        return;
      }
      res.status(204).send();
    }),
  );

  router.get('/stats', asyncHandler(async (req, res) => {
    const filters = parseReportFilters(req.query as Record<string, unknown>);
    const scoped = applyRbacToFilters(req.hubPrincipal, req.hubAuth?.rbacEnabled ?? false, filters);
    if (!scoped) {
      res.json({
        totalRuns: 0,
        totalSuites: 0,
        totalPassed: 0,
        totalFailed: 0,
        passRate: 0,
        frameworks: [],
        projects: [],
        tags: [],
        recentRuns: [],
        projectSummaries: [],
        runTrend: [],
        filters,
      });
      return;
    }
    const totalRuns = await Promise.resolve(store.countReports(scoped));
    const { totalSuites, totalPassed, totalFailed } = await Promise.resolve(store.aggregateStats(scoped));
    const recentRuns = await Promise.resolve(store.listReports({ ...scoped, limit: 5, offset: 0 }));
    const facets = await Promise.resolve(store.getFacets({
      project: scoped.project,
      from: scoped.from,
      to: scoped.to,
    }));
    const projectSummaries = await Promise.resolve(store.getProjectSummaries());
    const runTrend = await Promise.resolve(store.getRunTrend(14));

    res.json({
      totalRuns,
      totalSuites,
      totalPassed,
      totalFailed,
      passRate: totalSuites > 0 ? Math.round((totalPassed / totalSuites) * 100) : 0,
      frameworks: facets.frameworks.map((f) => f.value),
      projects: facets.projects,
      tags: facets.tags,
      recentRuns,
      projectSummaries,
      runTrend,
      filters: scoped,
    });
  }));

  return router;
}
