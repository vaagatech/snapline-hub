import { Router } from 'express';
import type { TestRunReport } from '../shared/types.js';
import type { ReportDatabase } from './db.js';
import { parseIngestMeta, parseReportFilters, validateTestRunReport } from './db.js';

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
    res.json({
      total: database.countReports(filters),
      limit: Math.min(filters.limit ?? 50, 200),
      offset: filters.offset ?? 0,
      filters,
      reports,
    });
  });

  router.get('/reports/:id', (req, res) => {
    const report = database.getReport(req.params.id);
    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }
    res.json(report);
  });

  router.post('/reports', (req, res) => {
    if (!validateTestRunReport(req.body)) {
      res.status(400).json({
        error: 'Invalid TestRunReport payload',
        hint: 'Expected { generatedAt, framework, summary: { total, passed, failed }, suites: [...] }',
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

    const { label: _l, project: _p, tags: _t, ...reportBody } = payload;
    const id = database.insertReport(reportBody as TestRunReport, meta);
    res.status(201).json({ id, url: `/reports/${id}` });
  });

  router.delete('/reports/:id', (req, res) => {
    const deleted = database.deleteReport(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }
    res.status(204).send();
  });

  router.get('/stats', (req, res) => {
    const filters = parseReportFilters(req.query as Record<string, unknown>);
    const reports = database.listReports({ ...filters, limit: 1000, offset: 0 });
    const totalRuns = database.countReports(filters);
    const totalSuites = reports.reduce((sum, r) => sum + r.total, 0);
    const totalPassed = reports.reduce((sum, r) => sum + r.passed, 0);
    const totalFailed = reports.reduce((sum, r) => sum + r.failed, 0);
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
      recentRuns: reports.slice(0, 5),
      filters,
    });
  });

  return router;
}
