# 4. Couche de tests avec Cloudflare vitest-plugin

Date: 2026-09-14

## Status

Accepted

## Context

Avant tout `wrangler deploy` en CI, il faut une couche de tests qui exerce
le code des deux Workers (`claude-token`, `cli-router`) dans un runtime
representatif — pas un mock Node generique — pour attraper les regressions
liees aux bindings KV, aux Access JWT, etc. avant qu'elles n'atteignent la
prod.

## Decision

Adopter `@cloudflare/vitest-plugin` (`^1.1.8`) + `vitest` (`^4.1.0`) dans
`workers/claude-token/` et `workers/cli-router/`, configure via
`vitest.config.js` :
`cloudflareTest({ wrangler: { configPath: "./wrangler.jsonc" } })`, selon la
doc officielle
https://developers.cloudflare.com/workers/testing/vitest-integration/ (et
https://developers.cloudflare.com/workers/testing/vitest-integration/write-your-first-test/
pour le config exact, citee en commentaire dans `vitest.config.js`). Les
tests vivent dans `test/worker.test.js` de chaque Worker et s'executent via
`npm test` (= `vitest run`). Dans `.github/workflows/deploy-workers.yml`,
une etape « Tests <worker> » (`npm install && npm test`) tourne pour les
deux Workers avant toute etape de deploiement conditionnelle, aussi bien
sur `push` que sur `workflow_dispatch` (commit `302d6d8`).

## Consequences

Les tests s'executent dans le vrai runtime Workers (Miniflare/workerd), pas
dans un mock DOM/Node : plus proche du comportement de prod pour KV,
`fetch`, etc. Un test qui echoue bloque le job avant les etapes de deploy
conditionnelles (elles sont plus bas dans le meme job `deploy`). Cout : un
`npm install` (avec `esbuild`/`workerd` en `allowScripts`) a chaque run CI,
et une dependance supplementaire a maintenir (`@cloudflare/vitest-plugin`,
`vitest`) dans chaque `package.json` de Worker.
