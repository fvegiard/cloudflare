# 2. workers_dev a true pour claude-token

Date: 2026-09-14

## Status

Accepted

## Context

`workers/claude-token/wrangler.jsonc` n'a ni domaine personnalise ni route
configuree. Verifie en direct le 2026-09-14 via l'API Cloudflare
(`GET /accounts/{id}/workers/domains` et `GET /accounts/{id}/workers/scripts`) :
aucun custom domain n'existe pour ce script. Le sous-domaine
`claude-token.fvegiard.workers.dev` est donc le SEUL point d'entree HTTP du
Worker. Ce sous-domaine est deja protege par Cloudflare Access via une
App Zero Trust de type « worker destination » (« Coffre a jeton Claude »,
id `b263ef69-f346-4f2e-be1d-a9a442ad7406`, confirmee via
`GET /accounts/{id}/access/apps`), qui valide un JWT RS256 avant de laisser
passer la requete jusqu'au Worker.

## Decision

Garder `workers_dev: true` dans `workers/claude-token/wrangler.jsonc`
(cf. doc officielle des options `wrangler.jsonc`,
https://developers.cloudflare.com/workers/wrangler/configuration/#workers_dev).
Ne PAS passer a `false` tant qu'aucun custom domain n'est cable.

## Consequences

Le Worker reste joignable a chaque redeploiement, avec Access qui continue
de gater l'acces (302 vers le TEAM_DOMAIN `jolly-feather-73f5.cloudflareaccess.com`
observe sans JWT). Repasser `workers_dev` a `false` sans avoir d'abord cable
un custom domain rendrait le Worker totalement injoignable — y compris pour
Access, qui n'aurait alors plus rien a proteger. Si un domaine personnalise
est ajoute plus tard, cette decision devra etre revisitee (ADR de suivi).
