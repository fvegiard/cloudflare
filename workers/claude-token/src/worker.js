// Coffre a jeton Claude Code - Francis
// Recupere depuis Cloudflare le 2026-09-13. Aucune source locale n'existait.
// Le jeton n'est rendu qu'a une requete portant un JWT Cloudflare Access
// dont la SIGNATURE est verifiee contre le JWKS de l'organisation.

const KEY  = "claude_code_oauth_token";
const META = "claude_code_oauth_token_meta";

let jwksCache = null;
let jwksAt = 0;

function b64url(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function getJwks(teamDomain) {
  const now = Date.now();
  if (jwksCache && now - jwksAt < 3600000) return jwksCache;
  const r = await fetch("https://" + teamDomain + "/cdn-cgi/access/certs");
  if (!r.ok) throw new Error("jwks indisponible");
  jwksCache = await r.json();
  jwksAt = now;
  return jwksCache;
}

// Verifie la signature RS256 du JWT Access et ses claims.
async function verifyAccessJwt(token, env) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  let header, payload;
  try {
    header  = JSON.parse(new TextDecoder().decode(b64url(parts[0])));
    payload = JSON.parse(new TextDecoder().decode(b64url(parts[1])));
  } catch { return null; }

  if (header.alg !== "RS256") return null;

  const jwks = await getJwks(env.TEAM_DOMAIN);
  const jwk = (jwks.keys || []).find(k => k.kid === header.kid);
  if (!jwk) return null;

  const key = await crypto.subtle.importKey(
    "jwk",
    { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256", ext: true },
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const ok = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5", key, b64url(parts[2]),
    new TextEncoder().encode(parts[0] + "." + parts[1])
  );
  if (!ok) return null;

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) return null;
  if (payload.nbf && payload.nbf > now + 60) return null;

  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!aud.includes(env.ACCESS_AUD)) return null;
  if (payload.iss !== "https://" + env.TEAM_DOMAIN) return null;

  return payload.email || payload.common_name || "machine";
}

const plain = (text, status = 200) =>
  new Response(text, { status, headers: {
    "content-type": "text/plain; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff"
  }});

const page = (body) => new Response(`<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Coffre a jeton Claude</title>
<style>
:root{color-scheme:dark}*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
background:#0d0f12;color:#e8eaed;font:16px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif;padding:24px}
.card{width:100%;max-width:620px;background:#161a1f;border:1px solid #262c34;border-radius:14px;padding:32px}
h1{margin:0 0 4px;font-size:22px;font-weight:600}
.sub{margin:0 0 28px;color:#9aa4b2;font-size:14px}
.state{display:flex;align-items:center;gap:10px;padding:14px 16px;border-radius:10px;margin-bottom:24px;font-size:14px}
.ok{background:#0f2a1b;border:1px solid #1f5133;color:#7ee2a8}
.empty{background:#2a220f;border:1px solid #5a4a1a;color:#e9c46a}
.dot{width:8px;height:8px;border-radius:50%;flex:none;background:currentColor}
label{display:block;font-size:13px;color:#9aa4b2;margin-bottom:8px}
textarea{width:100%;min-height:110px;padding:12px 14px;border-radius:10px;border:1px solid #2c333c;
background:#0d0f12;color:#e8eaed;font:13px/1.5 ui-monospace,Menlo,monospace;resize:vertical}
textarea:focus{outline:none;border-color:#4b8cf7}
button{margin-top:16px;width:100%;padding:13px;border:0;border-radius:10px;background:#4b8cf7;color:#fff;font-size:15px;font-weight:600;cursor:pointer}
button:hover{background:#3d7ae4}
.meta{margin-top:24px;padding-top:20px;border-top:1px solid #262c34;font-size:13px;color:#78828f}
.meta code{background:#0d0f12;padding:2px 6px;border-radius:5px;color:#9aa4b2;font-size:12px}
.who{margin-top:18px;font-size:12px;color:#5c6570}
</style></head><body><div class="card">${body}</div></body></html>`,
  { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });

export default {
  async fetch(request, env) {
    const who = await verifyAccessJwt(request.headers.get("Cf-Access-Jwt-Assertion"), env);
    if (!who) return plain("Acces refuse. Identite Cloudflare Access non verifiee.", 403);

    const url = new URL(request.url);

    if (url.pathname === "/token") {
      const token = await env.CLAUDE_TOKENS.get(KEY);
      if (!token) return plain("", 404);
      return plain(token);
    }

    if (url.pathname === "/install.sh") {
      return plain('#!/usr/bin/env bash\nset -euo pipefail\nCLAUDE_CODE_OAUTH_TOKEN="$(curl -fsS "'
        + url.origin + '/token" \\\n  -H "CF-Access-Client-Id: ${CF_ACCESS_CLIENT_ID}" \\\n'
        + '  -H "CF-Access-Client-Secret: ${CF_ACCESS_CLIENT_SECRET}")"\nexport CLAUDE_CODE_OAUTH_TOKEN\n');
    }

    if (url.pathname === "/install.ps1") {
      return plain('$env:CLAUDE_CODE_OAUTH_TOKEN = (Invoke-RestMethod -Uri "'
        + url.origin + '/token" -Headers @{\n'
        + '  "CF-Access-Client-Id"     = $env:CF_ACCESS_CLIENT_ID\n'
        + '  "CF-Access-Client-Secret" = $env:CF_ACCESS_CLIENT_SECRET\n})\n');
    }

    if (request.method === "POST" && url.pathname === "/") {
      const form = await request.formData();
      const token = String(form.get("token") || "").trim();
      if (!token) {
        return page('<h1>Jeton vide</h1><p class="sub">Rien n\'a ete enregistre.</p><a href="/"><button type="button">Retour</button></a>');
      }
      await env.CLAUDE_TOKENS.put(KEY, token);
      await env.CLAUDE_TOKENS.put(META, JSON.stringify({ updated: new Date().toISOString(), by: who }));
      return Response.redirect(url.origin + "/?ok=1", 303);
    }

    const token = await env.CLAUDE_TOKENS.get(KEY);
    const metaRaw = await env.CLAUDE_TOKENS.get(META);
    let when = "";
    if (metaRaw) {
      try {
        when = new Date(JSON.parse(metaRaw).updated)
          .toLocaleString("fr-CA", { timeZone: "America/Toronto" });
      } catch { /* meta illisible */ }
    }

    const state = token
      ? '<div class="state ok"><span class="dot"></span>Jeton en place, finit par <code>...'
        + token.slice(-6) + '</code>' + (when ? ' &middot; mis a jour le ' + when : '') + '</div>'
      : '<div class="state empty"><span class="dot"></span>Aucun jeton enregistre</div>';

    return page(
      '<h1>Coffre a jeton Claude</h1>'
      + '<p class="sub">Un seul endroit. Toutes tes machines lisent ici.</p>'
      + state
      + '<form method="POST" action="/">'
      + '<label for="token">' + (token ? "Remplacer le jeton" : "Coller le jeton")
      + ' &mdash; sortie de <code>claude setup-token</code></label>'
      + '<textarea id="token" name="token" placeholder="sk-ant-oat..." spellcheck="false" autocomplete="off"></textarea>'
      + '<button type="submit">' + (token ? "Remplacer" : "Enregistrer") + '</button>'
      + '</form>'
      + '<div class="meta">Les machines lisent <code>' + url.origin + '/token</code>'
      + ' avec leurs entetes de jeton de service.<br>Amorcage : <code>/install.sh</code> &middot; <code>/install.ps1</code></div>'
      + '<div class="who">Identite verifiee : ' + who + '</div>'
    );
  },
};
