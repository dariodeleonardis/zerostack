import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@zerostack/database";

// Sottodomini di sistema riservati che non possono essere registrati come pubblicazioni
const RESERVED_SUBDOMAINS = new Set([
  "www",
  "api",
  "admin",
  "app",
  "cdn",
  "static",
  "mail",
  "smtp",
  "auth",
  "login",
  "billing",
  "dashboard",
  "assets"
]);

/**
 * Endpoint per Caddy 'on_demand_tls ask'
 * Verifica che il dominio o sottodominio in arrivo sia autorizzato prima di emettere il certificato SSL Let's Encrypt.
 */
export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get("domain")?.toLowerCase().trim();

  if (!domain) {
    return new NextResponse("Parametro domain mancante", { status: 400 });
  }

  const rootDomain = (process.env.APP_DOMAIN || process.env.NEXT_PUBLIC_ROOT_DOMAIN || "zerostack.it").toLowerCase();

  // 1. Dominio principale della piattaforma o localhost
  if (
    domain === rootDomain ||
    domain === `www.${rootDomain}` ||
    domain === "zerostack.it" ||
    domain === "www.zerostack.it" ||
    domain === "localhost" ||
    domain === "127.0.0.1"
  ) {
    return new NextResponse("OK", { status: 200 });
  }

  // 2. Controllo Sottodomini automatici dei creator (*.zerostack.it)
  const isSubdomain = domain.endsWith(`.${rootDomain}`) || domain.endsWith(".zerostack.it");
  if (isSubdomain) {
    const matchedRoot = domain.endsWith(`.${rootDomain}`) ? rootDomain : "zerostack.it";
    const subdomain = domain.slice(0, domain.length - matchedRoot.length - 1);

    // Blocca sottodomini riservati di sistema
    if (RESERVED_SUBDOMAINS.has(subdomain)) {
      return new NextResponse("Sottodominio riservato di sistema", { status: 403 });
    }

    // Verifica formato slug valido (solo lettere minuscole, numeri e trattini)
    if (!/^[a-z0-9-]+$/.test(subdomain)) {
      return new NextResponse("Formato sottodominio non valido", { status: 400 });
    }

    try {
      // Verifica se esiste una pubblicazione o un utente con questo slug/handle
      const [pub, user] = await Promise.all([
        prisma.publication.findUnique({ where: { slug: subdomain } }),
        prisma.user.findFirst({ where: { handle: subdomain } })
      ]);

      if (pub || user) {
        return new NextResponse("OK", { status: 200 });
      }

      // Fallback per ambienti dimostrativi o test live predefiniti
      if (["tech-italia", "dario", "creator", "demo"].includes(subdomain)) {
        return new NextResponse("OK", { status: 200 });
      }

      return new NextResponse("Pubblicazione o utente non trovato per questo sottodominio", { status: 403 });
    } catch (dbErr) {
      console.warn("Verifica sottodominio fallback:", dbErr instanceof Error ? dbErr.message : dbErr);
      // Fallback di cortesia per demo offline se il database non risponde
      if (["tech-italia", "dario", "creator"].includes(subdomain)) {
        return new NextResponse("OK", { status: 200 });
      }
      return new NextResponse("Sottodominio non autorizzato", { status: 403 });
    }
  }

  // 3. Controllo Domini Personalizzati puntati via CNAME (es. newsletter.nomedominio.it)
  try {
    const publication = await prisma.publication.findFirst({
      where: {
        customDomain: domain,
        isDomainVerified: true
      }
    });

    if (publication) {
      return new NextResponse("OK", { status: 200 });
    }

    return new NextResponse("Dominio non autorizzato", { status: 403 });
  } catch (error) {
    console.warn("Verifica custom domain fallback:", error instanceof Error ? error.message : error);
    return new NextResponse("Dominio non autorizzato", { status: 403 });
  }
}
