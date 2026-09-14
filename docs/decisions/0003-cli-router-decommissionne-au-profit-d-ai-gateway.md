# 3. cli-router decommissionne au profit d'AI Gateway

Date: 2026-09-14

## Status

Accepted

## Context

`francis-cli-router` etait un Worker proxy place devant un service de
routage interne (binding `ROUTER`), jamais cable a un service reel. Le
2026-09-14, `GET /accounts/{id}/workers/scripts` confirme qu'aucun Worker
`francis-cli-router` n'existe plus dans le compte Cloudflare : il a ete
supprime. `private/ETAT.md` et `private/COORDINATION.md` (etat infra,
non commite dans le repo public) indiquent qu'il a ete remplace par
Cloudflare AI Gateway (gateway `francis-ai`, confirme via
`GET /accounts/{id}/ai-gateway/gateways`,
doc officielle https://developers.cloudflare.com/ai-gateway/). Le code
source reste dans `workers/cli-router/` (recupere, archive).

## Decision

1. Ne plus deployer `cli-router` automatiquement sur push : dans
   `.github/workflows/deploy-workers.yml`, l'etape `Deploy cli-router` ne se
   declenche que sur `workflow_dispatch` (commit `302d6d8`).
2. Garder `ROUTER_READY: "false"` dans `workers/cli-router/wrangler.jsonc`
   (503 volontaire cote code, cf. `src/worker.mjs`) plutot que d'inventer un
   service vers lequel cabler le binding `ROUTER` — aucun service de routage
   plausible n'existe dans le compte.
3. Garder le code dans le repo (pas de suppression) jusqu'a decision
   explicite de Francis de le reactiver ou de le retirer definitivement.

## Consequences

Un `git push` sur `main` ne ressuscite plus silencieusement une infra deja
retiree du compte Cloudflare. Le redeploiement manuel reste possible via
`workflow_dispatch` si Francis decide de reactiver `cli-router`. Le routage
CLI passe desormais par Cloudflare AI Gateway, hors du perimetre de ce
Worker.
