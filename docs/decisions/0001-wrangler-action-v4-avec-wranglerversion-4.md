# 1. Wrangler Action v4 avec wranglerVersion 4

Date: 2026-09-14

## Status

Accepted

## Context

`.github/workflows/deploy-workers.yml` deployait les deux Workers
(`claude-token`, `cli-router`) via `cloudflare/wrangler-action@v3`. Cette
version etait deja obsolete par rapport a `wrangler` installe localement
(4.131.1 via Homebrew, cf. `private/ETAT.md`), et n'epinglait pas
explicitement une version majeure de `wrangler` — risque de derive entre
ce qui tourne en CI et ce qui tourne en local.

## Decision

Basculer les deux etapes de deploiement (`claude-token`, `cli-router`) sur
`cloudflare/wrangler-action@v4` avec `wranglerVersion: "4"` explicite,
conformement a la doc officielle de l'action
(https://github.com/cloudflare/wrangler-action) et a la doc de test/deploiement
Workers (https://developers.cloudflare.com/workers/testing/vitest-integration/,
qui documente le meme pipeline CI). Commit de reference :
`302d6d8` (« CI : wrangler-action v4, tests Vitest avant deploiement,
cli-router en dispatch manuel »).

## Consequences

La CI utilise la meme branche majeure de `wrangler` (4.x) que le poste de
developpement, ce qui elimine une classe de bugs « ca marche en local mais
pas en CI » lies a des changements de comportement entre wrangler 3 et 4.
Contrepartie : toute montee de version future de `wrangler` doit etre
repercutee manuellement dans `wranglerVersion` (pas de mise a jour
automatique), et les deux workers doivent rester synchronises sur la meme
version majeure.
