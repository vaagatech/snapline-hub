/**
 * Seed Snapline Hub with representative Node.js and Python demo reports.
 * Usage: SNAPLINE_HUB_URL=http://localhost:3847 npm run seed:demos
 */
import type { TestRunReport } from '../shared/types.js';

const HUB_URL = process.env.SNAPLINE_HUB_URL ?? 'http://localhost:3847';

const NODE_SCENARIOS = [
  'snapline-ignore-fields',
  'api-vs-file-graphql',
  'project-graphql',
  'db-vs-db-sqlite',
  'project-db',
];

const PYTHON_SCENARIOS = [
  'snapline-transformations',
  'api-vs-file-rest',
  'project-graphql',
  'nosql-vs-nosql',
  'project-db',
];

function buildDemoReport(
  framework: string,
  scenarios: string[],
  opts: { passedRatio: number; label: string },
): TestRunReport {
  const suites = scenarios.map((id, i) => {
    const passed = i < Math.floor(scenarios.length * opts.passedRatio);
    return {
      name: id,
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
    };
  });

  const passed = suites.filter((s) => s.passed).length;
  return {
    generatedAt: new Date().toISOString(),
    framework,
    summary: {
      total: suites.length,
      passed,
      failed: suites.length - passed,
      durationMs: 8000 + scenarios.length * 120,
    },
    environment: {
      baseUrl: 'http://localhost:3000',
      suiteName: 'demo-seed',
      label: opts.label,
    },
    suites,
  };
}

async function push(
  report: TestRunReport,
  meta: { label: string; project: string; tags: string[] },
): Promise<void> {
  const response = await fetch(`${HUB_URL.replace(/\/+$/, '')}/api/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...report, ...meta }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Push failed (${response.status}): ${body}`);
  }
  const result = (await response.json()) as { id: string; url: string };
  console.log(`  ✓ ${meta.label} → ${HUB_URL}${result.url}`);
}

async function main(): Promise<void> {
  console.log(`Seeding Snapline Hub at ${HUB_URL}\n`);

  await push(
    buildDemoReport('@vaagatech/snapline-engine', NODE_SCENARIOS, {
      passedRatio: 1,
      label: 'Node.js demo — all passed',
    }),
    {
      label: 'Node.js demo — all passed',
      project: 'snapline-demo',
      tags: ['node', 'demo', 'seed'],
    },
  );

  await push(
    buildDemoReport('@vaagatech/snapline-engine', NODE_SCENARIOS, {
      passedRatio: 0.8,
      label: 'Node.js demo — mixed results',
    }),
    {
      label: 'Node.js demo — mixed results',
      project: 'snapline-demo',
      tags: ['node', 'demo', 'seed'],
    },
  );

  await push(
    buildDemoReport('snapline-engine', PYTHON_SCENARIOS, {
      passedRatio: 1,
      label: 'Python demo — all passed',
    }),
    {
      label: 'Python demo — all passed',
      project: 'snapline-demo',
      tags: ['python', 'demo', 'seed'],
    },
  );

  await push(
    buildDemoReport('snapline-engine', PYTHON_SCENARIOS, {
      passedRatio: 0.6,
      label: 'Python demo — mixed results',
    }),
    {
      label: 'Python demo — mixed results',
      project: 'snapline-demo',
      tags: ['python', 'demo', 'seed'],
    },
  );

  console.log('\nDone. Open Hub → All Runs → filter by tag "python" or "node".');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
