// Google finto per i test end to end dell'accesso con Google (OAuth 2.0 con PKCE).
// Il server web va avviato con GOOGLE_OAUTH_BASE=http://127.0.0.1:<porta>.
// Il test sceglie il profilo con setProfile() prima di chiamare il ritorno con un codice inventato:
// il token si dà solo se arrivano le chiavi e il verificatore PKCE giusti.
import http from "node:http";
import { createHash } from "node:crypto";

export function startGoogleMock(port = 12113, { clientId, clientSecret }) {
  const codes = new Map(); // codice -> { challenge, profile }
  const tokens = new Map(); // access_token -> profile
  const requests = [];

  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const url = new URL(req.url, "http://mock");
      const params = Object.fromEntries(new URLSearchParams(body));
      requests.push({ method: req.method, path: url.pathname, params, auth: req.headers.authorization ?? null });
      const send = (status, obj) => {
        res.writeHead(status, { "content-type": "application/json" });
        res.end(JSON.stringify(obj));
      };
      if (req.method === "POST" && url.pathname === "/token") {
        const entry = codes.get(params.code);
        const challenge = params.code_verifier ? createHash("sha256").update(params.code_verifier).digest("base64url") : "";
        if (params.client_id !== clientId || params.client_secret !== clientSecret) return send(401, { error: "invalid_client" });
        if (!entry || entry.challenge !== challenge || params.grant_type !== "authorization_code") return send(400, { error: "invalid_grant" });
        codes.delete(params.code);
        const token = `tok_${Math.random().toString(36).slice(2)}`;
        tokens.set(token, entry.profile);
        return send(200, { access_token: token, token_type: "Bearer", expires_in: 3600 });
      }
      if (req.method === "GET" && url.pathname === "/v1/userinfo") {
        const profile = tokens.get((req.headers.authorization ?? "").replace(/^Bearer /, ""));
        return profile ? send(200, profile) : send(401, { error: "invalid_token" });
      }
      send(404, { error: "not_found" });
    });
  });

  return new Promise((resolve) => {
    server.listen(port, "127.0.0.1", () =>
      resolve({
        requests,
        /** Prepara un codice di autorizzazione per questo profilo, legato alla sfida PKCE ricevuta. */
        issueCode(challenge, profile) {
          const code = `code_${Math.random().toString(36).slice(2)}`;
          codes.set(code, { challenge, profile });
          return code;
        },
        close: () => new Promise((r) => server.close(r))
      })
    );
  });
}
