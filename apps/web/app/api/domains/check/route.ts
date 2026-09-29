import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@zerostack/database";
import { slugProblem } from "@zerostack/shared";
import { rootDomain as platformDomain } from "../../../../lib/publications";

export const dynamic = "force-dynamic";

/**
 * Endpoint per Caddy 'on_demand_tls ask'
 * Verifica che il dominio o sottodominio in arrivo sia autorizzato prima di emettere il certificato SSL Let's Encrypt.
 * Un sottodominio ha un certificato solo se esiste la pubblicazione che la pagina mostrerà:
 * un certificato per una pagina 404 consumerebbe per niente la quota settimanale di Let's Encrypt.
 */
export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get("domain")?.toLowerCase().trim();

  if (!domain) {
    return new NextResponse("Parametro domain mancante", { status: 400 });
  }

  const rootDomain = platformDomain();

  // 1. Dominio principale della piattaforma o localhost
  if (domain === rootDomain || domain === `www.${rootDomain}` || domain === "localhost" || domain === "127.0.0.1") {
    return new NextResponse("OK", { status: 200 });
  }

  // 2. Sottodomini delle pubblicazioni (slug.zerostack.it)
  if (domain.endsWith(`.${rootDomain}`)) {
    const subdomain = domain.slice(0, domain.length - rootDomain.length - 1);

    const problem = slugProblem(subdomain);
    if (problem === "reserved") {
      return new NextResponse("Sottodominio riservato di sistema", { status: 403 });
    }
    if (problem) {
      return new NextResponse("Formato sottodominio non valido", { status: 400 });
    }

    try {
      const pub = await prisma.publication.findFirst({ where: { slug: subdomain, suspendedAt: null }, select: { id: true } });
      if (pub) {
        return new NextResponse("OK", { status: 200 });
      }
      return new NextResponse("Pubblicazione non trovata per questo sottodominio", { status: 403 });
    } catch (dbErr) {
      // Senza database non si può sapere: niente certificato, Caddy riproverà alla prossima visita.
      console.error("Verifica sottodominio non riuscita:", dbErr instanceof Error ? dbErr.message : dbErr);
      return new NextResponse("Verifica non disponibile", { status: 503 });
    }
  }

  // 3. Controllo Domini Personalizzati puntati via CNAME (es. newsletter.nomedominio.it)
  try {
    const publication = await prisma.publication.findFirst({
      where: {
        customDomain: domain,
        isDomainVerified: true,
        suspendedAt: null
      },
      select: { id: true }
    });

    if (publication) {
      return new NextResponse("OK", { status: 200 });
    }

    return new NextResponse("Dominio non autorizzato", { status: 403 });
  } catch (error) {
    console.error("Verifica custom domain non riuscita:", error instanceof Error ? error.message : error);
    return new NextResponse("Verifica non disponibile", { status: 503 });
  }
}
