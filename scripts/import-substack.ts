import * as fs from "fs";
import * as path from "path";
import { prisma } from "../packages/database/src/index";
import { importSubstackExport, readExport } from "../apps/web/lib/substack-import";

/**
 * Importazione da riga di comando dell'export di Substack (stessa logica della pagina
 * Studio → Importa da Substack). Gli articoli vengono attribuiti al proprietario della pubblicazione.
 *   npx tsx scripts/import-substack.ts <slug-pubblicazione> <export.zip | iscritti.csv>
 */
async function main() {
  const [slug, filePath] = process.argv.slice(2);
  if (!slug || !filePath || !fs.existsSync(filePath)) {
    console.log("Uso: npx tsx scripts/import-substack.ts <slug-pubblicazione> <export.zip | iscritti.csv>");
    process.exit(1);
  }
  const publication = await prisma.publication.findUnique({ where: { slug }, select: { id: true, name: true, ownerId: true } });
  if (!publication) {
    console.error(`❌ Pubblicazione "${slug}" non trovata`);
    process.exit(1);
  }

  const files = readExport(new Uint8Array(fs.readFileSync(filePath)), path.basename(filePath));
  const report = await importSubstackExport({ publicationId: publication.id, authorId: publication.ownerId, files });
  console.log(`✅ Import in "${publication.name}" completato`);
  console.table(report);
}

main()
  .catch((e) => {
    console.error("Errore durante l'importazione:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
