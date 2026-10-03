const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * Paginetta HTML autonoma per i link che arrivano dalle email (conferma, disiscrizione):
 * stanno sotto /api, fuori dal middleware dei sottodomini, e devono funzionare da qualsiasi host.
 * `bodyHtml` è già HTML fidato: i valori variabili passano da `text()`.
 */
export function simplePage(title: string, bodyHtml: string, status = 200): Response {
  const html = `<!doctype html>
<html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${escapeHtml(title)}</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#f9fafb;color:#111827;margin:0;padding:48px 16px}
main{max-width:480px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px}
h1{font-size:22px;margin:0 0 12px}p{line-height:1.6;color:#4b5563}
button{background:#111827;color:#fff;border:0;border-radius:8px;padding:12px 20px;font-size:15px;font-weight:600;cursor:pointer}
a{color:#2563eb}</style></head>
<body><main><h1>${escapeHtml(title)}</h1>${bodyHtml}</main></body></html>`;
  return new Response(html, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "referrer-policy": "no-referrer" }
  });
}

export const text = escapeHtml;
