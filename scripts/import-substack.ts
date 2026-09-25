import * as fs from "fs";
import * as path from "path";
import { prisma } from "../packages/database/src/index";

export function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let insideQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (insideQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Script di migrazione per importare iscritti e articoli esportati da Substack in ZeroStack
 * Utilizzo: npx ts-node scripts/import-substack.ts <slug-pubblicazione> <percorso-file-csv>
 */
async function importSubstack() {
  const args = process.argv.slice(2);
  const targetSlug = args[0] || "tech-italia";
  const csvFilePath = args[1];

  console.log(`🚀 [Migrazione Substack] Avvio importazione verso la pubblicazione: "${targetSlug}"`);

  const publication = await prisma.publication.findUnique({
    where: { slug: targetSlug }
  });

  if (!publication) {
    console.error(`❌ Errore: Pubblicazione "${targetSlug}" non trovata nel database.`);
    process.exit(1);
  }

  if (!csvFilePath || !fs.existsSync(csvFilePath)) {
    console.log("ℹ️  Nessun percorso CSV specificato. Esempio d'uso:");
    console.log("   npx ts-node scripts/import-substack.ts tech-italia ./subscribers.csv");
    return;
  }

  const fileContent = fs.readFileSync(csvFilePath, "utf-8");
  const lines = fileContent.split("\n").filter((l) => l.trim().length > 0);
  const header = lines[0].split(",");

  console.log(`📄 Trovate ${lines.length - 1} righe nel file export di Substack.`);

  let importedCount = 0;
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const email = cols[0]?.replace(/^"|"$/g, "").trim();
    if (!email || !email.includes("@")) continue;

    const isPaid = lines[i].toLowerCase().includes("paid");

    await prisma.newsletterSubscriber.upsert({
      where: {
        publicationId_email: {
          publicationId: publication.id,
          email
        }
      },
      update: {
        status: "ACTIVE"
      },
      create: {
        publicationId: publication.id,
        email,
        source: "IMPORT_SUBSTACK",
        isDoubleOptIn: true
      }
    });

    importedCount++;
  }

  console.log(`✅ Importazione completata! ${importedCount} iscritti importati con successo.`);
}

importSubstack()
  .catch((e) => {
    console.error("Errore durante l'importazione:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
