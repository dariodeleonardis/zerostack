import * as fs from "fs";
import * as path from "path";
import { prisma } from "../packages/database/src/index";
import { readExport, runImport } from "../apps/web/lib/import";
import { IMPORT_PLATFORMS, importPlatform } from "../apps/web/lib/import-platforms";

/**
 * Importazione da riga di comando dell'export di un'altra piattaforma (stessa logica della pagina
 * Studio → Importa). Gli articoli vengono attribuiti al proprietario della pubblicazione.
 *   npx tsx scripts/import-substack.ts <slug-pubblicazione> <file dell'export> [piattaforma, di serie substack]
 */
async function main() {
  const [slug, filePath, platformId = "substack"] = process.argv.slice(2);
  const platform = importPlatform(platformId);
  if (!slug || !filePath || !fs.existsSync(filePath) || !platform) {
    console.log("Uso: npx tsx scripts/import-substack.ts <slug-pubblicazione> <file dell'export> [piattaforma]");
    console.log(`Piattaforme: ${IMPORT_PLATFORMS.map((p) => p.id).join(", ")}`);
    process.exit(1);
  }
  const publication = await prisma.publication.findUnique({ where: { slug }, select: { id: true, name: true, ownerId: true } });
  if (!publication) {
    console.error(`❌ Pubblicazione "${slug}" non trovata`);
    process.exit(1);
  }

  const files = readExport(new Uint8Array(fs.readFileSync(filePath)), path.basename(filePath));
  const report = await runImport({ platform: platform.id, publicationId: publication.id, authorId: publication.ownerId, files });
  console.log(`✅ Import da ${platform.name} in "${publication.name}" completato`);
  console.table(report);
}

main()
  .catch((e) => {
    console.error("Errore durante l'importazione:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
