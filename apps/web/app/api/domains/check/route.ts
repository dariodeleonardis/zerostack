import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@zerostack/database";

/**
 * Endpoint per Caddy 'on_demand_tls ask'
 * Verifica che il dominio in arrivo sia autorizzato prima di emettere il certificato SSL Let's Encrypt.
 */
export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get("domain");

  if (!domain) {
    return new NextResponse("Parametro domain mancante", { status: 400 });
  }

  // 1. Dominio principale della piattaforma o localhost
  const mainDomain = process.env.APP_DOMAIN || "localhost";
  if (domain === mainDomain || domain === "localhost" || domain === "127.0.0.1") {
    return new NextResponse("OK", { status: 200 });
  }

  try {
    // 2. Verifica se il dominio personalizzato esiste tra le pubblicazioni attive
    const publication = await prisma.publication.findFirst({
      where: {
        customDomain: domain,
        isDomainVerified: true
      }
    });

    if (publication) {
      return new NextResponse("OK", { status: 200 });
    }

    // Se non è verificato o autorizzato, rifiuta l'emissione del certificato
    return new NextResponse("Dominio non autorizzato", { status: 403 });
  } catch (error) {
    console.error("Errore verifica dominio Caddy:", error);
    return new NextResponse("Errore server", { status: 500 });
  }
}
