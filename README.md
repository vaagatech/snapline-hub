# Snapline Hub

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)
[![docs](https://img.shields.io/badge/docs-GitHub%20Pages-blue)](https://vaagatech.github.io/snapline-hub/)

**Optional test results reporting UI** for the [Snapline](https://github.com/vaagatech/snapline) framework — an open-source product by [VaagaTech](https://www.vaagatech.com).

Snapline Hub stores and visualizes `TestRunReport` data from Node.js or Python test runs. It is **not required** to use Snapline — enable it only when you want a centralized dashboard for test execution history.

📖 **Full documentation:** [vaagatech.github.io/snapline-hub](https://vaagatech.github.io/snapline-hub/)

| Page | Description |
|------|-------------|
| [Overview](https://vaagatech.github.io/snapline-hub/) | Purpose, features, when to use Hub |
| [Installation](https://vaagatech.github.io/snapline-hub/installation.html) | Prerequisites, dev vs production, deployment |
| [Getting Started](https://vaagatech.github.io/snapline-hub/getting-started.html) | 5-minute walkthrough |
| [User Guide](https://vaagatech.github.io/snapline-hub/guide.html) | Dashboard, uploads, diff viewer |
| [Snapline Integration](https://vaagatech.github.io/snapline-hub/integration.html) | Node.js & Python push APIs, CI |
| [Architecture](https://vaagatech.github.io/snapline-hub/architecture.html) | Components, data model, storage |
| [Storage Adapters](https://vaagatech.github.io/snapline-hub/storage-adapters.html) | SQLite, PostgreSQL, custom backends |
| [API Reference](https://vaagatech.github.io/snapline-hub/api-reference.html) | REST endpoints |

**Related Snapline documentation:**
- [Snapline (Node.js)](https://vaagatech.github.io/snapline/) · [GitHub](https://github.com/vaagatech/snapline)
- [Snapline (Python)](https://vaagatech.github.io/snapline-python/) · [GitHub](https://github.com/vaagatech/snapline-python)

## Quick start

```bash
git clone https://github.com/vaagatech/snapline-hub.git
cd snapline-hub
npm install
npm run dev
```

Open **http://localhost:5173** (development) or **http://localhost:3847** after `npm run build && npm start` (production).

Push a report from Snapline:

```bash
# Node.js
SNAPLINE_HUB_URL=http://localhost:3847 npm run demo

# Python
SNAPLINE_HUB_URL=http://localhost:3847 uv run demo
```

See [Getting Started](https://vaagatech.github.io/snapline-hub/getting-started.html) for the full walkthrough.

## Features

- **Dashboard** — pass/fail summaries, pass rate, recent runs
- **Run history** — filter by passed/failed, drill into suites and steps
- **Diff viewer** — structured mismatch display (`path`, `actual`, `expected`)
- **Upload** — drag-and-drop JSON `TestRunReport` files
- **Push API** — ingest reports from Snapline test runners via HTTP
- **Pluggable storage** — SQLite by default; PostgreSQL or custom adapters via `ReportStore`

## Development

```bash
npm run dev          # API (:3847) + Vite dev server (:5173)
npm test             # API integration tests
npm run typecheck    # TypeScript check
npm run build        # Production build
npm start            # Run production server
```

## Publishing documentation

Documentation in `docs/` deploys to GitHub Pages via `.github/workflows/pages.yml`.

1. Set repository **Settings → Pages → Source** to **GitHub Actions**
2. Push changes under `docs/` to `main`

Local preview: `npx serve docs`

## License

[MIT](./LICENSE)
