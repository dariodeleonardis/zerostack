import { NextResponse } from "next/server";
import { prisma } from "@zerostack/database";
import { getCurrentUser } from "../../../../lib/auth";
import { readExport, runImport } from "../../../../lib/import";
import { importPlatform } from "../../../../lib/import-platforms";

const MAX_BYTES = 50 * 1024 * 1024;

// Upload dell'export di un'altra piattaforma (Substack, WordPress, Ghost...) dallo studio.
export async function POST(req: Request, { params }: { params: { platform: string } }) {
  // multipart/form-data: niente controllo JSON, ma l'origine dichiarata dal browser deve essere questa.
  const origin = req.headers.get("origin");
  const sameOrigin = (() => {
    try {
      return !origin || new URL(origin).host === req.headers.get("host");
    } catch {
      return false;
    }
  })();
  if (!sameOrigin) {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }
  const platform = importPlatform(params.platform);
  if (!platform) {
    return NextResponse.json({ error: "Piattaforma non supportata" }, { status: 404 });
  }
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Accedi per importare" }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const publicationId = form?.get("publicationId");
  if (!(file instanceof File) || typeof publicationId !== "string") {
    return NextResponse.json({ error: "Scegli la pubblicazione e il file dell'export" }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Il file deve pesare meno di 50 MB" }, { status: 400 });
  }

  const owner = await prisma.publicationMember.findFirst({ where: { publicationId, userId: user.id, role: "OWNER" }, select: { id: true } });
  if (!owner) {
    return NextResponse.json({ error: "Pubblicazione non trovata" }, { status: 404 });
  }

  let files: Map<string, string>;
  try {
    files = readExport(new Uint8Array(await file.arrayBuffer()), file.name);
  } catch {
    return NextResponse.json({ error: "Il file non è uno ZIP o un file di testo leggibile" }, { status: 400 });
  }

  const report = await runImport({ platform: platform.id, publicationId, authorId: user.id, files });
  if (report.subscribersFound === 0 && report.postsImported + report.postsDrafts + report.postsSkippedExisting + report.postsWithoutHtml === 0) {
    return NextResponse.json({ error: "Nel file non ci sono né iscritti né articoli da importare: controlla di aver scelto la piattaforma giusta", report }, { status: 422 });
  }
  return NextResponse.json({ report });
}
