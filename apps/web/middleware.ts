import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: [
    /*
     * Intercetta tutte le richieste tranne:
     * - api routes
     * - _next static files and chunks
     * - .well-known (WebFinger del Fediverse, verifiche ACME): deve rispondere anche sui sottodomini
     * - file con estensione (.ico, .png, .jpg, .svg, .css, .js, .xml, .txt)
     */
    "/((?!api/|_next/|_static/|\\.well-known/|[\\w-]+\\.\\w+).*)"
  ]
};

// Pagine della piattaforma che valgono uguali su ogni host (il piè di pagina le linka ovunque).
const PLATFORM_PATHS = ["/privacy", "/termini", "/cookie"];
const PLATFORM_PAGES = new Set(PLATFORM_PATHS);

// Con la pagina di cortesia accesa restano raggiungibili: le pagine legali, l'accesso (gli
// amministratori devono poter entrare) e la pagina di cortesia stessa.
const COURTESY_OPEN_PAGES = new Set(PLATFORM_PATHS.concat(["/login", "/forgot-password", "/reset-password", "/cortesia"]));
const COURTESY_CACHE_MS = 15_000;
let courtesyCache: { enabled: boolean; at: number } | null = null;

/**
 * La richiesta va fermata dalla pagina di cortesia? Lo stato generale si rilegge al massimo ogni
 * 15 secondi; solo a pagina accesa, e solo per chi ha un cookie di sessione, si chiede chi è.
 * Le API restano fuori dal middleware (vedi matcher): webhook, certificati e salute non si fermano.
 */
async function courtesyBlocks(req: NextRequest): Promise<boolean> {
  const base = `http://127.0.0.1:${process.env.PORT || 3000}`;
  try {
    if (!courtesyCache || Date.now() - courtesyCache.at > COURTESY_CACHE_MS) {
      const res = await fetch(`${base}/api/platform/access`, { cache: "no-store" });
      const data = await res.json();
      courtesyCache = { enabled: Boolean(data.enabled), at: Date.now() };
    }
    if (!courtesyCache.enabled) return false;
    if (!req.cookies.get("zs_session")) return true;
    const res = await fetch(`${base}/api/platform/access`, {
      cache: "no-store",
      headers: { cookie: req.headers.get("cookie") ?? "" }
    });
    const data = await res.json();
    return !data.open;
  } catch (err) {
    // Sito aperto se lo stato non si legge: meglio un sito visibile in anticipo che un sito sparito.
    console.error("[cortesia] controllo non riuscito, sito lasciato aperto:", err instanceof Error ? err.message : err);
    return false;
  }
}

/**
 * Pagina servita come pubblicazione (sottodominio o dominio dell'autore): il layout lo legge da
 * questa intestazione e toglie la barra e il piede di ZeroStack, lasciando la testata dell'autore.
 */
const PUBLICATION_HEADER = "x-zs-publication";

function asPublication(req: NextRequest, target?: URL): NextResponse {
  const headers = new Headers(req.headers);
  headers.set(PUBLICATION_HEADER, "1");
  return target ? NextResponse.rewrite(target, { request: { headers } }) : NextResponse.next({ request: { headers } });
}

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  if (!COURTESY_OPEN_PAGES.has(url.pathname) && (await courtesyBlocks(req))) {
    const res = NextResponse.rewrite(new URL("/cortesia", req.url));
    res.headers.set("X-Robots-Tag", "noindex");
    res.headers.set("Cache-Control", "no-store");
    return res;
  }
  if (PLATFORM_PAGES.has(url.pathname)) return NextResponse.next();
  const hostname = req.headers.get("host")?.toLowerCase() || "";
  const rootDomain = (process.env.APP_DOMAIN || process.env.NEXT_PUBLIC_ROOT_DOMAIN || "zerostack.it").toLowerCase();

  // Rimuove la porta dall'host (es. dario.zerostack.it:3000 -> dario.zerostack.it)
  const currentHost = hostname.split(":")[0];

  // 1. Dominio principale della piattaforma (zerostack.it, www.zerostack.it, localhost)
  const isMainDomain =
    currentHost === rootDomain ||
    currentHost === `www.${rootDomain}` ||
    currentHost === "zerostack.it" ||
    currentHost === "www.zerostack.it" ||
    currentHost === "localhost" ||
    currentHost === "127.0.0.1";

  if (isMainDomain) {
    return NextResponse.next();
  }

  // 2. Sottodominio creator (es. dario.zerostack.it, tech-italia.zerostack.it, dario.localhost)
  let subdomain: string | null = null;

  if (currentHost.endsWith(`.${rootDomain}`)) {
    subdomain = currentHost.slice(0, currentHost.length - rootDomain.length - 1);
  } else if (currentHost.endsWith(".zerostack.it")) {
    subdomain = currentHost.slice(0, currentHost.length - ".zerostack.it".length);
  } else if (currentHost.endsWith(".localhost")) {
    subdomain = currentHost.slice(0, currentHost.length - ".localhost".length);
  }

  if (subdomain && subdomain !== "www") {
    // Se l'utente visita la homepage del sottodominio (es. dario.zerostack.it/)
    if (url.pathname === "/") {
      return asPublication(req, new URL(`/p/${subdomain}`, req.url));
    }

    // Se il percorso punta già a rotte speciali o al prefisso /p/
    if (url.pathname.startsWith("/p/") || url.pathname.startsWith("/checkout/")) {
      return url.pathname.startsWith("/p/") ? asPublication(req) : NextResponse.next();
    }

    // Riscrive percorsi diretti (es. dario.zerostack.it/alternativa-substack -> /p/dario/alternativa-substack)
    return asPublication(req, new URL(`/p/${subdomain}${url.pathname}`, req.url));
  }

  // 3. Dominio personalizzato di terzo livello o CNAME esterno (es. newsletter.mario.it)
  if (url.pathname === "/") {
    return asPublication(req, new URL(`/p/${currentHost}`, req.url));
  }
  if (!url.pathname.startsWith("/p/") && !url.pathname.startsWith("/checkout/")) {
    return asPublication(req, new URL(`/p/${currentHost}${url.pathname}`, req.url));
  }

  return url.pathname.startsWith("/p/") ? asPublication(req) : NextResponse.next();
}
