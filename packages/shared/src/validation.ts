import { z } from "zod";
import { SlugSchema } from "./slugs";

export const RegisterSchema = z.object({
  name: z.string().trim().min(2, "Inserisci il tuo nome").max(80, "Nome massimo 80 caratteri"),
  email: z.string().trim().toLowerCase().email("Indirizzo email non valido").max(254),
  // Il nome utente vive nello stesso spazio dei sottodomini: nessuna pubblicazione di altri potrà usarlo
  handle: SlugSchema,
  password: z.string().min(10, "La password deve avere almeno 10 caratteri").max(200, "Password troppo lunga")
});

export const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Indirizzo email non valido").max(254),
  password: z.string().min(1, "Inserisci la password").max(200)
});

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

/** Dati fiscali dell'autore per emettere le fatture elettroniche a suo nome. */
export const FiscalProfileSchema = z
  .object({
    enabled: z.boolean(),
    kind: z.enum(["PERSON", "COMPANY"]),
    denominazione: z.string().trim().max(80).optional().or(z.literal("")),
    nome: z.string().trim().max(60).optional().or(z.literal("")),
    cognome: z.string().trim().max(60).optional().or(z.literal("")),
    partitaIva: z.string().trim().regex(partitaIvaRegex, "La partita IVA deve avere 11 cifre"),
    codiceFiscale: z
      .string()
      .trim()
      .refine((v) => codiceFiscaleRegex.test(v) || partitaIvaRegex.test(v), "Codice fiscale non valido"),
    regimeFiscale: z.enum(["RF01", "RF19"]),
    aliquotaIva: z.union([z.literal(22), z.literal(4)]).default(22),
    indirizzo: z.string().trim().min(3, "Indirizzo obbligatorio").max(60),
    numeroCivico: z.string().trim().max(8).optional().or(z.literal("")),
    cap: z.string().trim().regex(/^[0-9]{5}$/, "CAP non valido (5 cifre)"),
    comune: z.string().trim().min(2, "Comune obbligatorio").max(60),
    provincia: z.string().trim().regex(/^[A-Za-z]{2}$/, "Provincia di 2 lettere (es. RM)"),
    email: z.string().trim().email("Email non valida").max(256).optional().or(z.literal(""))
  })
  .superRefine((v, ctx) => {
    if (v.kind === "COMPANY" && !v.denominazione) ctx.addIssue({ code: "custom", path: ["denominazione"], message: "Ragione sociale obbligatoria" });
    if (v.kind === "PERSON" && (!v.nome || !v.cognome)) ctx.addIssue({ code: "custom", path: ["nome"], message: "Nome e cognome obbligatori" });
  });

export type FiscalProfileInput = z.infer<typeof FiscalProfileSchema>;

export const CreatePublicationSchema = z.object({
  name: z.string().trim().min(3, "Il nome della pubblicazione deve avere almeno 3 caratteri").max(80, "Nome massimo 80 caratteri"),
  // Lo slug diventa il sottodominio (slug.zerostack.it): stesse regole di /api/domains/check
  slug: SlugSchema,
  description: z.string().trim().max(250, "Descrizione massima 250 caratteri").optional(),
  primaryColor: z.string().regex(/^#[0-9a-f]{6}$/i, "Colore non valido").optional(),
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

// Salvataggio dall'editor dello studio: bozza, programmazione o pubblicazione immediata.
export const SavePostSchema = z
  .object({
    publicationId: z.string().uuid("Scegli una pubblicazione"),
    title: z.string().trim().min(2, "Il titolo è obbligatorio").max(200, "Titolo massimo 200 caratteri"),
    subtitle: z.string().trim().max(300, "Sottotitolo massimo 300 caratteri").optional(),
    contentHtml: z.string().max(500_000, "Il testo è troppo lungo"),
    access: z.enum(["FREE", "PAID_SUBSCRIBERS"]).default("FREE"),
    action: z.enum(["draft", "schedule", "publish"]),
    scheduledAt: z.string().datetime({ offset: true }).optional(),
    sendEmail: z.boolean().default(true),
    // Copertina e audio: URL dei file caricati (o di un indirizzo https esterno). null = togli.
    coverImageUrl: z.string().url("Copertina non valida").max(1000).nullable().optional(),
    podcast: z
      .object({
        audioUrl: z.string().url("Audio non valido").max(1000),
        durationSeconds: z.number().int().min(0).max(24 * 60 * 60).default(0)
      })
      .nullable()
      .optional()
  })
  .superRefine((data, ctx) => {
    const text = data.contentHtml.replace(/<[^>]+>/g, "").trim();
    if (data.action !== "draft" && text.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["contentHtml"], message: "Il contenuto non può essere vuoto" });
    }
    if (data.action === "schedule") {
      if (!data.scheduledAt) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["scheduledAt"], message: "Scegli data e ora di uscita" });
      } else if (new Date(data.scheduledAt).getTime() <= Date.now()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["scheduledAt"], message: "La data di uscita deve essere nel futuro" });
      }
    }
  });

export type SavePostInput = z.infer<typeof SavePostSchema>;

export const SubscribeSchema = z.object({
  publicationId: z.string().uuid(),
  email: z.string().trim().toLowerCase().email("Indirizzo email non valido").max(254),
  name: z.string().trim().max(80).optional()
});

export const PasswordResetRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email("Indirizzo email non valido").max(254)
});

export const PasswordResetSchema = z.object({
  token: z.string().min(20).max(200),
  password: z.string().min(10, "La password deve avere almeno 10 caratteri").max(200, "Password troppo lunga")
});

// Dominio personalizzato di una pubblicazione (es. newsletter.mario.it): minuscolo, senza schema né percorso.
export const CustomDomainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .transform((v) => v.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/\.$/, ""))
  .refine((v) => v.length <= 253 && /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/.test(v), {
    message: "Dominio non valido (es. newsletter.tuonome.it)"
  });

export const ProfileSchema = z.object({
  name: z.string().trim().min(2, "Inserisci il tuo nome").max(80, "Nome massimo 80 caratteri"),
  bio: z.string().trim().max(500, "Bio massimo 500 caratteri").optional().nullable(),
  avatarUrl: z.string().url("Immagine non valida").max(1000).optional().nullable()
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Inserisci la password attuale").max(200),
  newPassword: z.string().min(10, "La nuova password deve avere almeno 10 caratteri").max(200, "Password troppo lunga")
});
