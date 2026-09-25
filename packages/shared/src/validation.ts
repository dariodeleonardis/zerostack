import { z } from "zod";

// Validazione Codice Fiscale Italiano (16 caratteri alfanumerici)
export const codiceFiscaleRegex = /^[A-Z]{6}[0-9LMNPQRSTUV]{2}[A-EHLMPR-T][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/i;

// Validazione Partita IVA Italiana (11 cifre)
export const partitaIvaRegex = /^[0-9]{11}$/;

// Validazione Codice Univoco Destinatario SDI (7 caratteri alfanumerici)
export const sdiRegex = /^[A-Z0-9]{7}$/i;

export const ItalianBillingSchema = z.object({
  isCompany: z.boolean().default(false),
  ragioneSocialeOIntestatario: z.string().min(2, "Inserisci il nome o la ragione sociale"),
  codiceFiscale: z.string().refine((val) => codiceFiscaleRegex.test(val) || partitaIvaRegex.test(val), {
    message: "Codice Fiscale non valido o Partita IVA errata"
  }),
  partitaIva: z.string().optional().refine((val) => !val || partitaIvaRegex.test(val), {
    message: "Partita IVA deve contenere esattamente 11 cifre numeriche"
  }),
  codiceDestinatarioSDI: z.string().optional().refine((val) => !val || sdiRegex.test(val), {
    message: "Il codice SDI deve essere di 7 caratteri"
  }),
  pec: z.string().email("Indirizzo PEC non valido").optional().or(z.literal("")),
  indirizzo: z.string().min(3, "Indirizzo obbligatorio"),
  cap: z.string().regex(/^[0-9]{5}$/, "CAP italiano non valido (5 cifre)"),
  citta: z.string().min(2, "Città obbligatoria"),
  provincia: z.string().length(2, "Provincia deve essere di 2 lettere (es. RM, MI)"),
  paese: z.literal("IT").default("IT")
});

export const CreatePublicationSchema = z.object({
  name: z.string().min(3, "Il nome della pubblicazione deve avere almeno 3 caratteri"),
  slug: z.string().min(3).max(40).regex(/^[a-z0-9-]+$/, "Lo slug può contenere solo lettere minuscole, numeri e trattini"),
  description: z.string().max(250, "Descrizione massima 250 caratteri").optional(),
  customDomain: z.string().optional().refine((val) => !val || /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i.test(val), {
    message: "Dominio personalizzato non valido (es. newsletter.tuonome.it)"
  })
});

export const CreatePostSchema = z.object({
  publicationId: z.string().uuid(),
  title: z.string().min(2, "Il titolo è obbligatorio"),
  subtitle: z.string().optional(),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  contentHtml: z.string().min(1, "Il contenuto non può essere vuoto"),
  contentJson: z.any().optional(),
  coverImageUrl: z.string().url().optional().or(z.literal("")),
  access: z.enum(["FREE", "PAID_SUBSCRIBERS", "FOUNDING_MEMBERS", "TIER_SPECIFIC"]).default("FREE"),
  format: z.enum(["ARTICLE", "NEWSLETTER_ONLY", "PODCAST", "NOTE"]).default("ARTICLE"),
  sendEmailBlast: z.boolean().default(true),
  podcastAudioUrl: z.string().url().optional().or(z.literal("")),
  scheduledAt: z.string().datetime().optional()
});

export const CreateNoteSchema = z.object({
  content: z.string().min(1, "La nota non può essere vuota").max(1000, "Massimo 1000 caratteri"),
  mediaUrls: z.array(z.string().url()).max(4).optional(),
  replyToPostId: z.string().uuid().optional()
});

export const CreateSubscriptionTierSchema = z.object({
  name: z.string().min(2, "Nome del livello richiesto"),
  description: z.string().min(5, "Descrizione richiesta"),
  priceEur: z.number().min(1, "Il prezzo minimo è 1€"),
  interval: z.enum(["MONTH", "YEAR", "ONE_TIME"]),
  benefits: z.array(z.string()).min(1, "Inserisci almeno un vantaggio per gli abbonati")
});
