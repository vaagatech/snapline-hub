# GitHub Pages setup

Documentation lives in the `docs/` folder and deploys automatically via `.github/workflows/pages.yml`.

## One-time repository settings

1. Open **Settings → Pages** in the GitHub repository.
2. Under **Build and deployment**, set **Source** to **GitHub Actions** (not “Deploy from branch”).
3. Push to `main` (or `master`) — the workflow publishes on changes under `docs/`.

## URL

https://vaagatech.github.io/snapline-hub/

## Site structure

| Page | Contents |
|------|----------|
| [index.html](index.html) | Overview, when to use Hub, data flow |
| [installation.html](installation.html) | Dev vs production setup |
| [getting-started.html](getting-started.html) | Push your first report |
| [guide.html](guide.html) | UI guide: search, quick filters, projects & tags |
| [integration.html](integration.html) | Node.js and Python push APIs |
| [architecture.html](architecture.html) | Components and data model |
| [api-reference.html](api-reference.html) | REST API including `/api/facets` |

Styling: [assets/style.css](assets/style.css) — shared design with Snapline docs.

## Related documentation

| Repo | GitHub Pages URL |
|------|------------------|
| [vaagatech/snapline](https://github.com/vaagatech/snapline) | https://vaagatech.github.io/snapline/ |
| [vaagatech/snapline-python](https://github.com/vaagatech/snapline-python) | https://vaagatech.github.io/snapline-python/ |
| [vaagatech/snapline-hub](https://github.com/vaagatech/snapline-hub) | https://vaagatech.github.io/snapline-hub/ |

## Local preview

```bash
# from repo root
npx serve docs
# open http://localhost:3000
```

## Manual deploy

Actions → **Deploy documentation to GitHub Pages** → **Run workflow**
