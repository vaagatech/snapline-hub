import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
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
    expect(res.body.storage).toBe('sqlite');
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
    expect(res.body.projectSummaries).toBeDefined();
    expect(res.body.runTrend).toBeDefined();
  });

  it('deletes a report', async () => {
    const ingest = await request(app).post('/api/reports').send(sampleReport);
    const id = ingest.body.id;

    const del = await request(app).delete(`/api/reports/${id}`);
    expect(del.status).toBe(204);

    const detail = await request(app).get(`/api/reports/${id}`);
    expect(detail.status).toBe(404);
  });

  it('normalizes invalid pagination parameters', async () => {
    const res = await request(app).get('/api/reports?limit=-5&offset=not-a-number');
    expect(res.status).toBe(200);
    expect(res.body.limit).toBe(1);
    expect(res.body.offset).toBe(0);
  });

  it('caps pagination limit at 200', async () => {
    const res = await request(app).get('/api/reports?limit=999');
    expect(res.status).toBe(200);
    expect(res.body.limit).toBe(200);
  });

  it('rejects oversized ingest metadata', async () => {
    const res = await request(app).post('/api/reports').send({
      ...sampleReport,
      label: 'x'.repeat(300),
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/label exceeds/);
  });
});

describe('Snapline Hub API — stats aggregation', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'snapline-hub-stats-'));
  const dbPath = join(tempDir, 'stats.db');
  const { app, database } = createApp({ dbPath });

  afterAll(() => {
    database.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('aggregates stats across more than 1000 suites via SQL SUM', async () => {
    for (let i = 0; i < 1005; i++) {
      database.insertReport({
        ...sampleReport,
        generatedAt: `2026-07-07T${String(Math.floor(i / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}:00.000Z`,
      });
    }

    const res = await request(app).get('/api/stats');
    expect(res.status).toBe(200);
    expect(res.body.totalRuns).toBe(1005);
    expect(res.body.totalSuites).toBe(1005);
  });
});

describe('Snapline Hub API — API key auth', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'snapline-hub-auth-'));
  const dbPath = join(tempDir, 'auth.db');
  const originalKey = process.env.HUB_API_KEY;
  const originalRbac = process.env.HUB_RBAC_ENABLED;
  let app: ReturnType<typeof createApp>['app'];
  let database: ReturnType<typeof createApp>['database'];

  beforeAll(() => {
    delete process.env.HUB_RBAC_ENABLED;
    delete process.env.HUB_ADMINS;
    process.env.HUB_API_KEY = 'test-secret-key';
    const created = createApp({ dbPath });
    app = created.app;
    database = created.database;
  });

  afterAll(() => {
    database.close();
    rmSync(tempDir, { recursive: true, force: true });
    if (originalKey === undefined) {
      delete process.env.HUB_API_KEY;
    } else {
      process.env.HUB_API_KEY = originalKey;
    }
    if (originalRbac === undefined) {
      delete process.env.HUB_RBAC_ENABLED;
    } else {
      process.env.HUB_RBAC_ENABLED = originalRbac;
    }
  });

  it('rejects POST without API key when HUB_API_KEY is set', async () => {
    const res = await request(app).post('/api/reports').send(sampleReport);
    expect(res.status).toBe(401);
  });

  it('accepts POST with valid API key', async () => {
    const res = await request(app)
      .post('/api/reports')
      .set('X-Hub-Api-Key', 'test-secret-key')
      .send(sampleReport);
    expect(res.status).toBe(201);
  });

  it('allows GET without API key', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
  });
});

describe('Snapline Hub API — RBAC', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'snapline-hub-rbac-'));
  const dbPath = join(tempDir, 'rbac.db');
  const envBackup = {
    HUB_RBAC_ENABLED: process.env.HUB_RBAC_ENABLED,
    HUB_ADMINS: process.env.HUB_ADMINS,
    HUB_RBAC_API_KEYS: process.env.HUB_RBAC_API_KEYS,
    HUB_API_KEY: process.env.HUB_API_KEY,
  };

  afterEach(() => {
    for (const [key, value] of Object.entries(envBackup)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns auth/me for admin user header', async () => {
    process.env.HUB_ADMINS = 'admin@local';
    delete process.env.HUB_API_KEY;
    const { app, database } = createApp({ dbPath });
    try {
      const res = await request(app)
        .get('/api/auth/me')
        .set('X-Hub-User', 'admin@local');
      expect(res.status).toBe(200);
      expect(res.body.isAdmin).toBe(true);
      expect(res.body.permissions).toContain('admin:settings');
    } finally {
      database.close();
    }
  });

  it('denies report ingest for viewer role', async () => {
    process.env.HUB_RBAC_ENABLED = 'true';
    process.env.HUB_RBAC_API_KEYS = JSON.stringify({
      keys: { 'viewer-key': { role: 'viewer', projects: ['allowed-project'] } },
    });
    const { app, database } = createApp({ dbPath });
    try {
      const denied = await request(app)
        .post('/api/reports?project=allowed-project')
        .set('X-Hub-Api-Key', 'viewer-key')
        .send(sampleReport);
      expect(denied.status).toBe(403);
    } finally {
      database.close();
    }
  });

  it('allows automation key to ingest reports', async () => {
    process.env.HUB_RBAC_ENABLED = 'true';
    process.env.HUB_RBAC_API_KEYS = JSON.stringify({
      keys: { 'auto-key': { role: 'automation', projects: ['*'], label: 'CI' } },
    });
    const { app, database } = createApp({ dbPath });
    try {
      const res = await request(app)
        .post('/api/reports?project=ci-project')
        .set('X-Hub-Api-Key', 'auto-key')
        .send(sampleReport);
      expect(res.status).toBe(201);
    } finally {
      database.close();
    }
  });
});

describe('Snapline Hub API — custom storage adapter', () => {
  it('loads the example in-memory adapter via factory', async () => {
    const { createReportStore } = await import('../server/storage/factory.js');
    const store = await createReportStore({
      driver: 'custom',
      customModule: './server/storage/custom-adapter.example.ts',
    });
    const { app, database } = createApp({ store });

    try {
      const ingest = await request(app)
        .post('/api/reports')
        .send(sampleReport);
      expect(ingest.status).toBe(201);

      const health = await request(app).get('/api/health');
      expect(health.body.storage).toBe('custom-example');
      expect(health.body.reports).toBe(1);
    } finally {
      await Promise.resolve(database.close());
    }
  });
});
