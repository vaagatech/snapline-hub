# GitHub Pages setup

Documentation lives in the `docs/` folder and deploys automatically via `.github/workflows/pages.yml`.

## One-time repository settings

1. Open **Settings → Pages** in the GitHub repository.
2. Under **Build and deployment**, set **Source** to **GitHub Actions** (not “Deploy from branch”).
3. Push to `main` (or `master`) — the workflow publishes on changes under `docs/`.

## URL

https://vaagatech.github.io/snapline-hub/

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
