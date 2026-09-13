# Infrastructure Cloudflare — Francis

Source de verite unique. Plus de repo jetable, plus de "nouvelle tentative".
Tout ce qui tourne sur Cloudflare doit avoir son code ici.

## Compte

- CLI wrangler connecte : fvegiard@outlook.com
- Account ID : ea42abd83477186ff36c312182a9318e
- wrangler 4.131.1 (Homebrew), Node 26, Ubuntu 26

## Inventaire au 2026-09-13

### Workers
| Nom | Etat | Code local |
|---|---|---|
| claude-token | fonctionnel | workers/claude-token (recupere) |
| francis-cli-router | casse (503) | workers/cli-router (recupere) |
| flat-mud-fde5 | template Hello World, a supprimer | non |

### KV
| Namespace | ID | Usage |
|---|---|---|
| CLAUDE_TOKENS | 4ac277f16d42450fb92bc49362c4b523 | coffre jeton Claude |
| CREDS | 63da55f8bb3b409e8fea03d7c40b3cf8 | a identifier |
| MAVIS_KB | 79a180a4d5a54a978cfd56f6937c174a | a identifier |

### D1
| Base | ID | Region |
|---|---|---|
| francis-core | d8cd6c56-fee4-4242-a4e1-792a1a11834f | ENAM |

### Non active
- R2 : a activer dans le dashboard (bouton Enable)
- Durable Objects / Queues / Vectorize : rien de deploye
