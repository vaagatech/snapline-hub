/**
 * Seed Snapline Hub with one report per demo scenario (project = scenario id).
 *
 * Usage:
 *   npm run seed:demos
 *   SNAPLINE_HUB_URL=http://localhost:3947 npm run seed:demos
 *
 * Start Hub first: npm run dev  (API default :3847) or PORT=3947 npm start
 */
import type { TestRunReport } from '../shared/types.js';

const HUB_URL = process.env.SNAPLINE_HUB_URL ?? 'http://localhost:3847';

async function assertHubReachable(): Promise<void> {
  const healthUrl = `${HUB_URL.replace(/\/+$/, '')}/api/health`;
  try {
    const response = await fetch(healthUrl);
    if (!response.ok) {
      throw new Error(`health check returned ${response.status}`);
    }
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error(`Cannot reach Snapline Hub at ${HUB_URL} (${reason}).`);
    console.error('');
    console.error('Start the hub in another terminal, then retry:');
    console.error('  npm run dev              # API on :3847, UI on :5173');
    console.error('  PORT=3947 npm start      # if :3847 is in use (e.g. Snapline demo mock)');
    console.error('');
    console.error('Or point at a running instance:');
    console.error('  SNAPLINE_HUB_URL=http://localhost:3947 npm run seed:demos');
    process.exit(1);
  }
}

const SCENARIOS = [
  'snapline-ignore-fields',
  'snapline-transformations',
  'snapline-data-mapping-lookup',
  'db-vs-db-sqlite',
  'db-vs-db-cross-dialect',
  'nosql-vs-nosql',
  'snapline-data-mapping-function',
  'db-comparison-transformations',
  'snapline-combined-options',
  'api-vs-file-rest',
  'api-vs-file-rest-cases',
  'api-vs-file-graphql',
  'api-vs-file-soap',
  'api-vs-db-rest',
  'api-vs-db-graphql',
  'api-vs-db-soap',
  'db-vs-api-rest',
  'db-vs-api-graphql',
  'db-vs-api-soap',
  'project-graphql',
  'project-db',
];

function buildScenarioReport(
  scenarioId: string,
  framework: string,
  passed: boolean,
): TestRunReport {
  return {
    generatedAt: new Date().toISOString(),
    framework,
    summary: {
      total: 1,
      passed: passed ? 1 : 0,
      failed: passed ? 0 : 1,
      durationMs: 1200 + scenarioId.length * 40,
    },
    environment: {
      baseUrl: 'http://localhost:3000',
      scenarioId,
    },
    suites: [
      {
        name: scenarioId,
        passed,
        results: [
          {
            step: 'run',
            passed,
            message: passed ? 'Scenario passed' : 'Scenario failed — segment mapping mismatch',
            ...(passed
              ? {}
              : {
                  diff: {
                    path: 'segment',
                    actual: 'premium',
                    expected: 'standard',
                    message: 'Value mismatch',
                  },
                }),
          },
        ],
      },
    ],
  };
}

async function pushScenario(
  scenarioId: string,
  framework: string,
  passed: boolean,
  languageTag: 'node' | 'python',
): Promise<void> {
  const report = buildScenarioReport(scenarioId, framework, passed);
  try {
    const response = await fetch(`${HUB_URL.replace(/\/+$/, '')}/api/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...report,
        label: `${scenarioId} (${languageTag})`,
        project: scenarioId,
        tags: [languageTag, 'demo', 'seed', scenarioId],
      }),
    });
    if (!response.ok) {
      const body = await response.text();
      console.warn(`  ✗ ${scenarioId} (${languageTag}): ${response.status} ${body}`);
      return;
    }
    const result = (await response.json()) as { id: string; url: string };
    console.log(`  ✓ ${scenarioId} (${languageTag}) → ${HUB_URL}${result.url}`);
  } catch (err) {
    console.warn(`  ✗ ${scenarioId} (${languageTag}):`, err instanceof Error ? err.message : err);
  }
}

async function main(): Promise<void> {
  await assertHubReachable();
  console.log(`Seeding Snapline Hub at ${HUB_URL}`);
  console.log(`One report per scenario (${SCENARIOS.length} projects × 2 languages)\n`);

  for (const scenarioId of SCENARIOS) {
    const hash = scenarioId.split('').reduce((sum, c) => sum + c.charCodeAt(0), 0);
    await pushScenario(scenarioId, '@vaagatech/snapline-engine', hash % 5 !== 0, 'node');
    await pushScenario(scenarioId, 'snapline-engine', hash % 4 !== 0, 'python');
  }

  console.log('\nDone. Open Hub dashboard to browse all projects.');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
