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
<meta name="robots" content="noindex"><title>${escapeHtml(title)} | ZeroStack</title>
<style>
/* Stile del sito (tailwind.config.js): inchiostro, carta, zafferano; Bodoni per marchio e titoli.
   I caratteri (licenza SIL OFL) stanno in public/fonts: la pagina è fuori dal layout di Next. */
@font-face{font-family:"Bodoni Moda";font-style:normal;font-weight:800;font-display:swap;src:url(/fonts/bodoni-moda-800.woff2) format("woff2")}
@font-face{font-family:"Bodoni Moda";font-style:italic;font-weight:400;font-display:swap;src:url(/fonts/bodoni-moda-italic.woff2) format("woff2")}
@font-face{font-family:Archivo;font-style:normal;font-weight:100 900;font-display:swap;src:url(/fonts/archivo.woff2) format("woff2")}
body{font-family:Archivo,"Helvetica Neue",Helvetica,Arial,sans-serif;background:#F6F1E7;color:#141210;margin:0}
header{background:#141210;border-bottom:3px solid #F2B705;padding:16px}
.brand{display:block;max-width:520px;margin:0 auto;font-family:"Bodoni Moda",Didot,"Bodoni 72",Georgia,serif;font-size:28px;line-height:1;color:#F6F1E7;text-decoration:none;letter-spacing:-.5px}
.brand b{font-weight:800}.brand i{font-style:italic}.brand span{color:#F2B705}
main{max-width:520px;margin:48px auto;padding:0 16px}
.card{background:#FBF8F2;border:1px solid #E4DED2;border-radius:8px;padding:32px}
h1{font-family:"Bodoni Moda",Didot,"Bodoni 72",Georgia,serif;font-size:34px;font-weight:800;line-height:1.1;margin:0 0 16px}
p{line-height:1.6;color:#2F2A24;margin:0 0 14px}
a{color:#141210;font-weight:700;text-decoration:underline;text-underline-offset:4px}
a:hover{color:#7A5800}
a.btn{display:inline-block;margin-top:8px;background:#F2B705;color:#141210;border-radius:999px;padding:12px 24px;font-size:15px;text-decoration:none}
a.btn:hover{background:#141210;color:#F6F1E7}
button{background:#F2B705;color:#141210;border:0;border-radius:999px;padding:12px 24px;font-size:15px;font-weight:700;cursor:pointer}
button:hover{background:#141210;color:#F6F1E7}
</style></head>
<body><header><a class="brand" href="/" aria-label="ZeroStack, pagina iniziale"><b>Zero</b><i>Stack</i><span>.</span></a></header>
<main><div class="card"><h1>${escapeHtml(title)}</h1>${bodyHtml}</div></main></body></html>`;
  return new Response(html, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "referrer-policy": "no-referrer" }
  });
}

export const text = escapeHtml;
