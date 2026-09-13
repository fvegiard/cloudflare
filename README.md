# cloudflare

Code source des Workers Cloudflare.

## Structure

- `workers/claude-token` — coffre a jeton protege par Cloudflare Access
- `workers/cli-router` — proxy de routage (actuellement en 503, origine absente)
- `private/` — submodule prive : etat de l'infra, identifiants internes (repo `cloudflare-private`)

## Deployer

Tout git push sur `main` qui touche `workers/**` declenche le workflow GitHub
Actions `Deploy Workers`, qui execute `wrangler deploy` pour chaque worker.

Secrets a configurer dans Settings > Secrets and variables > Actions :

- `CLOUDFLARE_API_TOKEN` — token API avec droits Edit Workers Scripts + Workers KV
- `CLOUDFLARE_ACCOUNT_ID` — id du compte

Le submodule `private/` n'est jamais clone ni deploye par CI (submodules: false).
