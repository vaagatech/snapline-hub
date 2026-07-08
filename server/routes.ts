import { Router } from 'express';
import type { TestRunReport } from '../shared/types.js';
import type { ReportDatabase } from './db.js';
import {
  parseIngestMeta,
  parseReportFilters,
  validateIngestMeta,
  validateTestRunReport,
} from './db.js';
import { requireApiKey } from './middleware.js';

const MAX_BODY_BYTES = 10 * 1024 * 1024;

export function createApiRouter(database: ReportDatabase): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.json({ status: 'ok', reports: database.countReports() });
  });

  router.get('/facets', (req, res) => {
    const filters = parseReportFilters(req.query as Record<string, unknown>);
    const facets = database.getFacets({
      project: filters.project,
      from: filters.from,
      to: filters.to,
    });
    res.json(facets);
  });

  router.get('/reports', (req, res) => {
    const filters = parseReportFilters(req.query as Record<string, unknown>);
    const reports = database.listReports(filters);
    const { limit, offset } = {
      limit: Math.min(filters.limit ?? 50, 200),
      offset: filters.offset ?? 0,
    };
    res.json({
      total: database.countReports(filters),
      limit: Number.isFinite(limit) ? Math.min(Math.max(1, limit), 200) : 50,
      offset: Number.isFinite(offset) ? Math.max(0, offset) : 0,
      filters,
      reports,
    });
  });

  router.get('/reports/:id', (req, res) => {
    const id = String(req.params.id);
    const report = database.getReport(id);
    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }
    res.json(report);
  });

  router.post('/reports', requireApiKey(), (req, res) => {
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
    const id = database.insertReport(reportBody as TestRunReport, meta);
    res.status(201).json({ id, url: `/reports/${id}` });
  });

  router.delete('/reports/:id', requireApiKey(), (req, res) => {
    const id = String(req.params.id);
    const deleted = database.deleteReport(id);
    if (!deleted) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }
    res.status(204).send();
  });

  router.get('/stats', (req, res) => {
    const filters = parseReportFilters(req.query as Record<string, unknown>);
    const totalRuns = database.countReports(filters);
    const { totalSuites, totalPassed, totalFailed } = database.aggregateStats(filters);
    const recentRuns = database.listReports({ ...filters, limit: 5, offset: 0 });
    const facets = database.getFacets({
      project: filters.project,
      from: filters.from,
      to: filters.to,
    });

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
      filters,
    });
  });

  return router;
}
