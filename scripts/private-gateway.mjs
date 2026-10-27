import { createServer, request as forward } from "node:http";
import { privateCookieName, privateHost, privateOrigin } from "../apps/web/src/lib/private-host.ts";

const loginPage = `<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>Digitales Rezeptbuch · Anmelden</title><style>body{margin:0;background:#0f172a;color:#e8efff;font:18px system-ui;min-height:100dvh;display:grid;place-items:center}main{box-sizing:border-box;width:min(100%,480px);padding:28px}h1{font-size:32px}label,input,button{display:block;box-sizing:border-box;width:100%}input,button{font:inherit;margin:16px 0;padding:18px;border-radius:14px;border:1px solid #5578ac}input{background:#19283e;color:white}button{background:#8bb5ff;color:#0f172a;font-weight:650}p{line-height:1.5;color:#bfcee8}</style><main><h1>Digitales Rezeptbuch</h1><p>Dein privates Rezeptbuch auf iPhone und iPad. Melde dich mit deinem persönlichen Zugang an.</p><form action="/_zugang" method="post"><label>Persönliches Passwort<input name="password" type="password" required minlength="20" maxlength="200" autocomplete="current-password"></label><button>Anmelden</button></form></main></html>`;

export function createPrivateGateway({ origin: configuredOrigin, password, sessionKey, internalToken, targetPort }) {
  const origin = privateOrigin(configuredOrigin), host = new URL(origin).host, auth = privateHost(sessionKey, origin);
  if (typeof password !== "string" || password.length < 20 || password.length > 200 || !internalToken || internalToken.length < 40 || !Number.isInteger(targetPort) || targetPort < 1024 || targetPort > 65535) throw new Error("Privaten Serverzugang vollständig einrichten.");
  const failures = { since: 0, count: 0 };
  return createServer({ requestTimeout: 60000, headersTimeout: 15000, maxHeaderSize: 16384 }, async (req, res) => {
    const end = (code, body, type = "application/json; charset=utf-8") => {
      res.writeHead(code, { "Content-Type": type, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "X-Frame-Options": "DENY", "Strict-Transport-Security": "max-age=31536000", ...(type.startsWith("text/html") ? { "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'" } : {}) });
      res.end(body);
    };
    // Health check deliberately reveals no recipe, account or configuration data.
    if (req.method === "GET" && req.url === "/_health") return end(200, '{"ok":true}');
    if (req.headers.host !== host || !req.url?.startsWith("/") || req.url.startsWith("//")) return end(403, '{"error":"Ungültige Adresse."}');
    const url = new URL(req.url, origin);
    if (url.origin !== origin) return end(403, '{"error":"Ungültige Adresse."}');
    const mutation = !["GET", "HEAD"].includes(req.method ?? "");
    if (mutation && req.headers.origin !== origin) return end(403, '{"error":"Eigener Ursprung erforderlich."}');
    if (url.pathname === "/_zugang" && req.method === "POST") {
      if (Date.now() - failures.since > 60000) { failures.since = Date.now(); failures.count = 0; }
      if (failures.count >= 20) { res.setHeader("Retry-After", "60"); return end(429, '{"error":"Bitte eine Minute warten."}'); }
      failures.count++;
      if (!req.headers["content-type"]?.startsWith("application/x-www-form-urlencoded")) return end(415, '{"error":"Ungültige Anmeldung."}');
      const chunks = []; let size = 0;
      try {
        for await (const chunk of req) { size += chunk.length; if (size > 4096) return end(413, '{"error":"Anmeldung zu groß."}'); chunks.push(chunk); }
        const candidate = new URLSearchParams(Buffer.concat(chunks).toString("utf8")).get("password") ?? "";
        if (!auth.passwordMatches(candidate, password)) return end(401, loginPage.replace("Dein privates Rezeptbuch", "Das Passwort stimmt nicht. Dein privates Rezeptbuch"), "text/html; charset=utf-8");
        res.writeHead(303, { Location: "/", "Cache-Control": "no-store", "Set-Cookie": `${privateCookieName}=${auth.issue()}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=2592000` });
        return res.end();
      } catch { return end(400, '{"error":"Anmeldung unterbrochen."}'); }
    }
    const session = (req.headers.cookie ?? "").split(";").map(s => s.trim()).find(s => s.startsWith(`${privateCookieName}=`))?.slice(privateCookieName.length + 1) ?? "";
    if (!auth.verify(session)) return url.pathname.startsWith("/api/") ? end(401, '{"error":"Bitte am privaten Rezeptbuch anmelden."}') : end(200, loginPage, "text/html; charset=utf-8");
    const headers = { ...req.headers, host: `127.0.0.1:${targetPort}`, "x-recipe-owner": internalToken };
    // The loopback API is reachable only after this gateway's owner and CSRF checks.
    for (const name of Object.keys(headers)) if (name.startsWith("x-forwarded-") || ["forwarded", "connection", "upgrade", "proxy-authorization", "cookie"].includes(name)) delete headers[name];
    if (mutation || req.headers.origin) headers.origin = `http://127.0.0.1:${targetPort}`;
    const upstream = forward({ host: "127.0.0.1", port: targetPort, path: url.pathname + url.search, method: req.method, headers, timeout: 180000 }, response => {
      const outgoing = { ...response.headers, "X-Frame-Options": "DENY", "Referrer-Policy": "no-referrer", "Strict-Transport-Security": "max-age=31536000" };
      delete outgoing["set-cookie"]; res.writeHead(response.statusCode ?? 502, outgoing); response.pipe(res);
    });
    let bytes = 0;
    req.on("data", chunk => { bytes += chunk.length; if (bytes > 26 * 1024 * 1024) { upstream.destroy(); if (!res.headersSent) end(413, '{"error":"Datei zu groß."}'); } });
    upstream.on("timeout", () => upstream.destroy());
    upstream.on("error", () => { if (!res.headersSent) end(502, '{"error":"Rezeptbuch vorübergehend nicht erreichbar."}'); else res.destroy(); });
    req.on("aborted", () => upstream.destroy()); res.on("close", () => { if (!res.writableEnded) upstream.destroy(); });
    req.pipe(upstream);
  });
}
