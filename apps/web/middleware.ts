import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: [
    /*
     * Intercetta tutte le richieste tranne:
     * - api routes
     * - _next static files and chunks
     * - file con estensione (.ico, .png, .jpg, .svg, .css, .js, .xml, .txt)
     */
    "/((?!api/|_next/|_static/|[\\w-]+\\.\\w+).*)"
  ]
};

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
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
      return NextResponse.rewrite(new URL(`/p/${subdomain}`, req.url));
    }

    // Se il percorso punta già a rotte speciali o al prefisso /p/
    if (url.pathname.startsWith("/p/") || url.pathname.startsWith("/checkout/")) {
      return NextResponse.next();
    }

    // Riscrive percorsi diretti (es. dario.zerostack.it/alternativa-substack -> /p/dario/alternativa-substack)
    return NextResponse.rewrite(new URL(`/p/${subdomain}${url.pathname}`, req.url));
  }

  // 3. Dominio personalizzato di terzo livello o CNAME esterno (es. newsletter.mario.it)
  if (url.pathname === "/") {
    return NextResponse.rewrite(new URL(`/p/${currentHost}`, req.url));
  }
  if (!url.pathname.startsWith("/p/") && !url.pathname.startsWith("/checkout/")) {
    return NextResponse.rewrite(new URL(`/p/${currentHost}${url.pathname}`, req.url));
  }

  return NextResponse.next();
}
