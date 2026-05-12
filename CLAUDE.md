# landing-anto

Personal link-in-bio landing page for Anto Lancuba (antonellalancuba.com).

## Tech stack

- Vanilla HTML/CSS/JS — no build step, no framework
- Cloudflare Pages Functions (ES Modules, `.js` files)
- Cloudflare KV for persistent data storage
- GitHub API (@octokit/rest) for committing data back to repo
- Content is in Spanish

## Project structure

```
index.html / style.css        — Public landing page
dashboard/                     — Admin panel (password-protected)
functions/                     — Cloudflare Pages Functions
  api/                         — API endpoints (/api/*)
  go/[id].js                   — Pretty redirect (/go/:id)
  [id].js                      — Catch-all pretty URLs (/:id)
  lib/                         — Shared utilities (auth, track-handler)
data/site-data.json            — Static fallback for site content
wrangler.toml                  — Cloudflare config
_routes.json                   — Controls which paths go to Functions
_redirects                     — URL redirects
.github/workflows/deploy.yml   — Auto-deploy on push to master
```

## Serverless functions

| Function | Purpose |
|---|---|
| `api/auth.js` | Login — validates ADMIN_PASSWORD |
| `api/site-data.js` | GET site content (KV → fallback to static JSON) |
| `api/save-data.js` | POST updated content (KV + GitHub commit) |
| `api/track.js` | GET link click analytics via ?id=X |
| `api/metrics.js` | GET analytics data |
| `api/events.js` | GET detailed event analytics |
| `api/upload-image.js` | POST profile image upload |
| `api/upload-link-image.js` | POST link thumbnail upload |
| `go/[id].js` | Redirect /go/:id with tracking |
| `[id].js` | Redirect /:id with tracking (catch-all) |
| `lib/auth.js` | Shared auth verification |
| `lib/track-handler.js` | Shared tracking logic |

## Commands

- Dev server: `npm run dev` (runs `wrangler pages dev .`)
- Deploy: `npm run deploy` (runs `wrangler pages deploy .`)
- Auto-deploys on push to `master` via GitHub Action

## Environment variables

Required in Cloudflare Pages dashboard (Settings > Environment variables):
- `ADMIN_PASSWORD` — dashboard login
- `GITHUB_TOKEN` — for committing data/images back to repo
- `GITHUB_REPO` — format: `owner/repo`

## KV Namespaces

Configured in Cloudflare Pages dashboard (Settings > Functions > KV namespace bindings):
- `SITE_DATA` — site content storage
- `CLICKS` — click count per link
- `EVENTS` — detailed event arrays per link

## Gotchas

- **KV vs static fallback**: `site-data.js` tries KV first, falls back to reading `data/site-data.json` via `env.ASSETS.fetch()`. After saving from dashboard, KV has the latest data but the static file is only updated via GitHub commit (async).
- **Shared `verifyAuth`**: Auth verification is centralized in `functions/lib/auth.js` and imported by all protected functions. Signature: `verifyAuth(req, env)`.
- **GitHub API SHA requirement**: When committing file updates via Octokit, you must first GET the current file to obtain its SHA, then PUT with that SHA.
- **KV list pagination**: `env.NAMESPACE.list()` returns max 1000 keys per call. Metrics and events functions handle pagination via cursor.
- **`nodejs_compat` flag**: Required in `wrangler.toml` for `Buffer` and `@octokit/rest` to work.
- **`_routes.json`**: Controls which paths invoke Functions vs serve static files. Static assets (CSS, JS, images) are excluded.
