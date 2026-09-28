import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/auth";
import { checkSlugAvailability, publicationUrl, SLUG_REASON_MESSAGES } from "../../../../lib/publications";

export const dynamic = "force-dynamic";

// Risposta per il modulo di creazione mentre l'autore scrive: il controllo vero si ripete alla creazione.
export async function GET(req: NextRequest) {
  const slug = (req.nextUrl.searchParams.get("slug") ?? "").trim().toLowerCase();
  const user = await getCurrentUser();
  const result = await checkSlugAvailability(slug, user?.id);

  if (result.available) {
    return NextResponse.json({ available: true, url: publicationUrl(slug) });
  }
  return NextResponse.json({ available: false, reason: result.reason, message: SLUG_REASON_MESSAGES[result.reason] });
}
