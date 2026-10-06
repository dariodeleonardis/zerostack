// Le piattaforme da cui si importa: le usano il menu dello studio, la pagina di import e l'API.
// Niente dipendenze dal server: questo file finisce anche nel browser.

export type ImportPlatformId =
  | "substack"
  | "wordpress"
  | "ghost"
  | "medium"
  | "beehiiv"
  | "mailchimp"
  | "kit"
  | "buttondown"
  | "mailerlite"
  | "altro";

export interface ImportPlatform {
  id: ImportPlatformId;
  name: string;
  /** Cosa arriva su ZeroStack. */
  brings: string;
  /** Come si scarica l'export sulla vecchia piattaforma. */
  steps: string[];
  fileLabel: string;
  accept: string;
}

const CSV = ".csv,text/csv";
const ZIP_CSV = ".zip,.csv,application/zip,text/csv";

export const IMPORT_PLATFORMS: ImportPlatform[] = [
  {
    id: "substack",
    name: "Substack",
    brings: "Iscritti (già confermati) e articoli, con il loro paywall.",
    steps: ["Nelle impostazioni della pubblicazione apri Esportazioni.", "Crea un nuovo export e scarica lo ZIP.", "Caricalo qui così com'è."],
    fileLabel: "Export di Substack (.zip) oppure CSV degli iscritti",
    accept: ZIP_CSV
  },
  {
    id: "wordpress",
    name: "WordPress",
    brings: "Articoli pubblicati e bozze. WordPress non ha iscritti: se usi un plugin per la newsletter, esporta il suo CSV e usa «Altro».",
    steps: ["Nel pannello vai in Strumenti → Esporta.", "Scegli «Articoli» e scarica il file di esportazione (.xml).", "Se il file è diviso in più parti, caricale una alla volta."],
    fileLabel: "File di esportazione di WordPress (.xml)",
    accept: ".xml,.zip,text/xml,application/xml,application/zip"
  },
  {
    id: "ghost",
    name: "Ghost",
    brings: "Articoli (con l'anteprima pubblica dei pezzi a pagamento) e iscritti, in due file separati.",
    steps: [
      "Articoli: Settings → Advanced → Import/Export → Export, scarica il file .json.",
      "Iscritti: Members → menu in alto → Export all members, scarica il CSV.",
      "Carica qui prima un file e poi l'altro."
    ],
    fileLabel: "Export di Ghost (.json) oppure CSV dei membri",
    accept: ".json,.csv,application/json,text/csv"
  },
  {
    id: "medium",
    name: "Medium",
    brings: "Articoli pubblicati e bozze. Medium non consegna le email dei follower.",
    steps: ["Settings → Security and apps → Download your information.", "Medium ti manda lo ZIP per email.", "Caricalo qui così com'è."],
    fileLabel: "Archivio di Medium (.zip)",
    accept: ".zip,application/zip"
  },
  {
    id: "beehiiv",
    name: "beehiiv",
    brings: "Iscritti attivi; quelli a pagamento vengono segnalati.",
    steps: ["Audience → Subscribers.", "Esporta tutti gli iscritti in CSV.", "Carica qui il file."],
    fileLabel: "CSV degli iscritti di beehiiv",
    accept: CSV
  },
  {
    id: "mailchimp",
    name: "Mailchimp",
    brings: "Iscritti. Disiscritti e indirizzi rimbalzati restano fuori.",
    steps: ["Audience → All contacts → Export Audience.", "Scarica lo ZIP quando è pronto.", "Caricalo qui così com'è: prendiamo solo il file degli iscritti."],
    fileLabel: "Export di Mailchimp (.zip) oppure CSV degli iscritti",
    accept: ZIP_CSV
  },
  {
    id: "kit",
    name: "Kit (ConvertKit)",
    brings: "Iscritti attivi.",
    steps: ["Subscribers → seleziona tutti.", "Esporta in CSV.", "Carica qui il file."],
    fileLabel: "CSV degli iscritti di Kit",
    accept: CSV
  },
  {
    id: "buttondown",
    name: "Buttondown",
    brings: "Iscritti attivi; quelli a pagamento vengono segnalati.",
    steps: ["Subscribers → Export.", "Scarica il CSV.", "Carica qui il file."],
    fileLabel: "CSV degli iscritti di Buttondown",
    accept: CSV
  },
  {
    id: "mailerlite",
    name: "MailerLite",
    brings: "Iscritti attivi.",
    steps: ["Subscribers → Export.", "Scarica il CSV degli iscritti attivi.", "Carica qui il file."],
    fileLabel: "CSV degli iscritti di MailerLite",
    accept: ZIP_CSV
  },
  {
    id: "altro",
    name: "Altro",
    brings: "Iscritti da qualunque servizio, purché il file abbia una colonna con l'email.",
    steps: ["Esporta gli iscritti dal servizio che usi oggi in CSV.", "Controlla che ci sia una colonna «email».", "Carica qui il file."],
    fileLabel: "CSV degli iscritti",
    accept: ZIP_CSV
  }
];

export function importPlatform(id: string | null | undefined): ImportPlatform | undefined {
  return IMPORT_PLATFORMS.find((p) => p.id === id);
}
