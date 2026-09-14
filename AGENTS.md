# Repository Guidelines

## Project Overview

Source code for two Cloudflare Workers ("Code source des Workers Cloudflare"):

- **claude-token** (`workers/claude-token/`): a token vault for the Claude Code OAuth
  token, protected by Cloudflare Access JWT validation.
- **cli-router** (deployed as `francis-cli-router`, `workers/cli-router/`): a proxy in
  front of an internal router service, gated behind a "commissioning" readiness flag.

There is no package manager, build tool, or test runner in this repo — just two
Workers Modules-API scripts and their `wrangler.jsonc` configs, deployed via GitHub
Actions.

## Architecture & Data Flow

**claude-token**: validates Cloudflare Access JWTs with RS256 via
`https://<TEAM_DOMAIN>/cdn-cgi/access/certs` JWKS (`aud=ACCESS_AUD`,
`iss=https://<TEAM_DOMAIN>`, 60s `nbf` leeway, JWKS cached in-isolate for 1h). Routes:
- `GET /token` — 403 without a valid Access JWT; otherwise serves the token stored at
  KV key `claude_code_oauth_token`.
- `GET /install.sh`, `GET /install.ps1` — bootstrap scripts authenticating via
  `CF-Access-Client-Id`/`CF-Access-Client-Secret` service-token headers.
- `POST /` — form field `token` → KV put + a `META` JSON record, then `303 /?ok=1`.
- `GET /` — French dark-themed HTML management page showing the last 6 chars of the
  current token plus an update form.

**cli-router**: allowlists only `/management.html` and the `/v1/`, `/v1beta/`,
`/v0/management/` prefixes (everything else 404s JSON). A commissioning gate checks
`ROUTER_READY !== 'true'` — while not ready, everything except `/v1/models` and
`/management.html` returns `503` JSON. Requests are proxied via `env.ROUTER.fetch` to
`http://router.internal`, rewriting `x-forwarded-*` headers from `cf-connecting-ip`.
Proxy errors return `503` with `retry-after: 5`. **`env.ROUTER` is intentionally not
declared in `wrangler.jsonc`** — it's a dashboard-configured service binding added
later; until then the proxy target doesn't exist and requests legitimately 503.

## Key Directories

- `workers/claude-token/` — `src/worker.js` (~175 lines), `wrangler.jsonc`. KV
  namespace `CLAUDE_TOKENS` (id `4ac277f16d42450fb92bc49362c4b523`). Vars
  `TEAM_DOMAIN` / `ACCESS_AUD` ship as `A_REMPLIR` placeholders.
- `workers/cli-router/` — `src/worker.mjs`, `wrangler.jsonc`. Var `ROUTER_READY:
  "false"` until commissioning is complete.
- `.github/workflows/deploy-workers.yml` — the only deploy path.
- `private/` — a **private git submodule** (`cloudflare-private`) holding infra state
  and internal credentials. **Never read, clone, or deploy it**; CI explicitly checks
  out with `submodules: false`.

## Development Commands

There is no local build/test toolchain. Deploys happen only through GitHub Actions on
push to `main` touching `workers/**`, or via `workflow_dispatch` (input `worker`:
`claude-token` or `cli-router`).

- `claude-token` deploys **only** via manual `workflow_dispatch` (never on push —
  deliberate, see commit `d9d9b3f`).
- `cli-router` deploys on push to `main` (and via `workflow_dispatch`).
- CI checks out with `actions/checkout@v4`, `submodules: false`; a guard step greps
  `workers/claude-token/wrangler.jsonc` for `A_REMPLIR` and fails the run if found;
  deploy steps use `cloudflare/wrangler-action@v4` with `wranglerVersion: "4"`,
  `command: deploy`.
- Required CI secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
- Local dev (claude-token only):
  ```
  npx wrangler@4 dev workers/claude-token --config workers/claude-token/wrangler.jsonc
  ```
  cli-router's `ROUTER` binding is dashboard-side only, so `wrangler dev` cannot
  exercise its proxy path locally.

## Code Conventions & Common Patterns

- All comments, docs, commit messages, and user-facing strings are **unaccented ASCII
  French** (e.g. `Verifier`, `deploiement`). Keep API/technical tokens in English.
- Commit style: `Scope : description`, with a space before the colon, e.g.
  `CI : ne plus deployer claude-token automatiquement sur push`.
- Plain ESM Workers Modules API: `export default { async fetch(...) {...} }`. No
  frameworks — routing is a hand-rolled if-chain over `request.method` / `url.pathname`.
- Responses use `text/plain` or HTML helper functions with `cache-control: no-store`.
- Errors are plain text (e.g. `403 'Acces refuse...'`) for claude-token, JSON
  `{ error: '...' }` for cli-router.
- Caller identity is derived from the Access JWT as
  `email || common_name || 'machine'`.
- The KV `META` record is JSON `{ updated, by }`, tracking who last updated the token.

## Important Files

- `workers/claude-token/src/worker.js`, `workers/cli-router/src/worker.mjs`
- `workers/claude-token/wrangler.jsonc`, `workers/cli-router/wrangler.jsonc`
- `.github/workflows/deploy-workers.yml`, `README.md`, `.gitmodules`
- `A_REMPLIR` placeholders in `claude-token/wrangler.jsonc` are load-bearing: the CI
  guard fails the deploy while they're present, and they double as the JWT `aud`
  check — never fill them in casually or remove the guard.
- Cloudflare account id is hard-coded identically in both `wrangler.jsonc` files:
  `ea42abd83477186ff36c312182a9318e`.
- `workers_dev: false` in both configs — routes are configured in the dashboard, not
  in code.

## Runtime/Tooling Preferences

- Cloudflare Workers V8 isolates, `compatibility_date` `2026-05-25`, Wrangler 4 (via
  `wrangler-action`).
- Zero npm dependencies, no lint/format config, no Node version pin.
- Do not introduce new tooling/conventions lightly — e.g. adding a `package.json`
  changes the project's whole footprint and should be a deliberate, discussed choice,
  not an incidental side effect of another task.

## Testing & QA

- No tests exist and CI has no test step — only the `A_REMPLIR` placeholder guard and
  `wrangler deploy`.
- If asked to add tests, follow Cloudflare's official pattern:
  `@cloudflare/vitest-pool-workers` + vitest
  (https://developers.cloudflare.com/workers/testing/vitest-integration/).
- Remember cli-router's `ROUTER` binding is dashboard-only, so local/CI test runs
  cannot exercise the real proxy path without mocking `env.ROUTER`.

## Gotchas

- Never enable submodules in CI, and never read/clone/deploy `private/`.
- Never make `claude-token` auto-deploy on push — this was deliberately reverted.
- Untracked `.bak-fix-20260914` files are local backups — don't restore or commit them.
- `.omc/` is untracked harness state — ignore it.
- Repo is small and deliberate: 9 tracked files, 5 commits total; avoid unnecessary
  churn or restructuring.
