import { afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createApp } from '../server/index.js';
import type { TestRunReport } from '../shared/types.js';

const sampleReport: TestRunReport = {
  generatedAt: '2026-07-07T10:00:00.000Z',
  framework: '@vaagatech/snapline-engine',
  summary: { total: 1, passed: 0, failed: 1, durationMs: 450 },
  environment: { baseUrl: 'http://localhost:3000' },
  suites: [
    {
      name: 'Customer account — GraphQL',
      passed: false,
      results: [
        { step: '01-pass-customer-account', passed: true },
        {
          step: '04-fail-segment-mapping',
          passed: false,
          message: 'Expected mismatch at segment',
          diff: {
            path: 'segment',
            actual: 'premium',
            expected: 'standard',
            message: 'Value mismatch',
          },
        },
      ],
    },
  ],
};

describe('Snapline Hub API', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'snapline-hub-test-'));
  const dbPath = join(tempDir, 'test.db');
  const { app, database } = createApp({ dbPath });

  afterAll(() => {
    database.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns health status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('ingests a TestRunReport', async () => {
    const res = await request(app).post('/api/reports').send(sampleReport);
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.url).toMatch(/^\/reports\//);
  });

  it('ingests report with project and tags', async () => {
    const res = await request(app)
      .post('/api/reports')
      .send({
        ...sampleReport,
        label: 'Node demo run',
        project: 'snapline-demo',
        tags: ['node', 'demo'],
      });

    expect(res.status).toBe(201);
    const detail = await request(app).get(`/api/reports/${res.body.id}`);
    expect(detail.body.project).toBe('snapline-demo');
    expect(detail.body.tags).toEqual(['demo', 'node']);
  });

  it('rejects invalid payloads', async () => {
    const res = await request(app).post('/api/reports').send({ invalid: true });
    expect(res.status).toBe(400);
  });

  it('lists and retrieves reports', async () => {
    const ingest = await request(app).post('/api/reports').send(sampleReport);
    const id = ingest.body.id;

    const list = await request(app).get('/api/reports');
    expect(list.status).toBe(200);
    expect(list.body.reports.length).toBeGreaterThan(0);

    const detail = await request(app).get(`/api/reports/${id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.report.suites[0].name).toBe('Customer account — GraphQL');
    expect(detail.body.report.suites[0].results[1].diff.path).toBe('segment');
  });

  it('filters reports by tag', async () => {
    await request(app).post('/api/reports').send({
      ...sampleReport,
      project: 'snapline-demo',
      tags: ['python', 'demo'],
    });
    await request(app).post('/api/reports').send({
      ...sampleReport,
      generatedAt: '2026-07-08T10:00:00.000Z',
      project: 'snapline-demo',
      tags: ['node', 'demo'],
    });

    const pythonOnly = await request(app).get('/api/reports?tags=python');
    expect(pythonOnly.status).toBe(200);
    expect(pythonOnly.body.reports.every((r: { tags: string[] }) => r.tags.includes('python'))).toBe(true);

    const nodeOnly = await request(app).get('/api/reports?tags=node');
    expect(nodeOnly.body.reports.every((r: { tags: string[] }) => r.tags.includes('node'))).toBe(true);

    const bothTags = await request(app).get('/api/reports?tags=node,demo&tagMode=all');
    expect(bothTags.status).toBe(200);
    expect(bothTags.body.reports.every((r: { tags: string[] }) =>
      r.tags.includes('node') && r.tags.includes('demo'),
    )).toBe(true);
  });

  it('filters reports by project and date', async () => {
    await request(app).post('/api/reports').send({
      ...sampleReport,
      generatedAt: '2026-06-01T10:00:00.000Z',
      project: 'my-app',
      tags: ['ci'],
    });

    const byProject = await request(app).get('/api/reports?project=my-app');
    expect(byProject.body.reports.every((r: { project: string }) => r.project === 'my-app')).toBe(true);

    const byDate = await request(app).get('/api/reports?from=2026-07-01T00:00:00.000Z');
    expect(byDate.body.reports.every((r: { generatedAt: string }) => r.generatedAt >= '2026-07-01')).toBe(true);
  });

  it('returns facets', async () => {
    const res = await request(app).get('/api/facets');
    expect(res.status).toBe(200);
    expect(res.body.projects).toBeDefined();
    expect(res.body.tags).toBeDefined();
    expect(res.body.frameworks).toBeDefined();
  });

  it('returns stats with projects and tags', async () => {
    const res = await request(app).get('/api/stats');
    expect(res.status).toBe(200);
    expect(res.body.totalRuns).toBeGreaterThan(0);
    expect(res.body.projects).toBeDefined();
    expect(res.body.tags).toBeDefined();
  });

  it('deletes a report', async () => {
    const ingest = await request(app).post('/api/reports').send(sampleReport);
    const id = ingest.body.id;

    const del = await request(app).delete(`/api/reports/${id}`);
    expect(del.status).toBe(204);

    const detail = await request(app).get(`/api/reports/${id}`);
    expect(detail.status).toBe(404);
  });
});
