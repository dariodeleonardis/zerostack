// Server Stripe finto per i test end to end: risponde alle poche chiamate che ZeroStack usa
// e registra ogni richiesta (con l'header Stripe-Account) per le verifiche.
// Il server web va avviato con STRIPE_API_BASE=http://127.0.0.1:<porta>.
import http from "node:http";

export function startStripeMock(port = 12111) {
  let n = 0;
  // Un prefisso casuale per esecuzione: gli ID non si ripetono tra un test e l'altro, come su Stripe.
  const runId = Math.random().toString(36).slice(2, 8);
  const id = (prefix) => `${prefix}_${runId}${++n}`;
  const accounts = new Map();
  const subscriptions = new Map();
  const requests = [];

  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const params = Object.fromEntries(new URLSearchParams(body));
      const url = new URL(req.url, "http://mock");
      const account = req.headers["stripe-account"] ?? null;
      requests.push({ method: req.method, path: url.pathname, account, params, idempotencyKey: req.headers["idempotency-key"] ?? null });
      const send = (status, obj) => {
        res.writeHead(status, { "content-type": "application/json", "request-id": id("req") });
        res.end(JSON.stringify(obj));
      };
      const parts = url.pathname.split("/").filter(Boolean); // ["v1", "accounts", "acct_x"]

      if (req.method === "POST" && url.pathname === "/v1/accounts") {
        const acct = { id: id("acct"), object: "account", charges_enabled: false, metadata: {} };
        accounts.set(acct.id, acct);
        return send(200, acct);
      }
      if (req.method === "GET" && parts[1] === "accounts" && parts[2]) {
        const acct = accounts.get(parts[2]);
        return acct ? send(200, acct) : send(404, { error: { type: "invalid_request_error", message: "No such account" } });
      }
      if (req.method === "POST" && url.pathname === "/v1/account_links") {
        return send(200, { object: "account_link", url: `https://connect.stripe.test/onboarding/${params.account}` });
      }
      if (req.method === "POST" && url.pathname === "/v1/products") return send(200, { id: id("prod"), object: "product" });
      if (req.method === "POST" && url.pathname === "/v1/prices") return send(200, { id: id("price"), object: "price" });
      if (req.method === "POST" && url.pathname === "/v1/checkout/sessions") {
        const sid = id("cs");
        return send(200, { id: sid, object: "checkout.session", url: `https://checkout.stripe.test/${sid}` });
      }
      if (parts[1] === "subscriptions" && parts[2]) {
        const sub = subscriptions.get(parts[2]);
        if (!sub) return send(404, { error: { type: "invalid_request_error", message: "No such subscription" } });
        if (req.method === "POST" && "cancel_at_period_end" in params) sub.cancel_at_period_end = params.cancel_at_period_end === "true";
        if (req.method === "DELETE") sub.status = "canceled";
        return send(200, sub);
      }
      send(404, { error: { type: "invalid_request_error", message: `mock: ${req.method} ${url.pathname} non gestito` } });
    });
  });

  return new Promise((resolve) =>
    server.listen(port, "127.0.0.1", () =>
      resolve({
        requests,
        setChargesEnabled: (acctId, enabled) => (accounts.get(acctId).charges_enabled = enabled),
        addSubscription: (sub) => subscriptions.set(sub.id, sub),
        getSubscription: (subId) => subscriptions.get(subId),
        close: () => new Promise((r) => server.close(r))
      })
    )
  );
}
