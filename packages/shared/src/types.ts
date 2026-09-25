export type UserRole = "READER" | "AUTHOR" | "ADMIN" | "SUPERADMIN";

export type PostAccess = "FREE" | "PAID_SUBSCRIBERS" | "FOUNDING_MEMBERS" | "TIER_SPECIFIC";

export type PostFormat = "ARTICLE" | "NEWSLETTER_ONLY" | "PODCAST" | "NOTE";

export type PostStatus = "DRAFT" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED";

export type BillingInterval = "MONTH" | "YEAR" | "ONE_TIME";

export interface ItalianBillingDetails {
  isCompany: boolean;
  ragioneSocialeOIntestatario: string;
  codiceFiscale: string;
  partitaIva?: string;
  codiceDestinatarioSDI?: string; // 7 caratteri alfanumerici
  pec?: string; // Indirizzo PEC alternativo al codice SDI
  indirizzo: string;
  cap: string;
  citta: string;
  provincia: string; // 2 lettere es. RM, MI, NA
  paese: string; // "IT"
}

export interface PublicationTheme {
  primaryColor: string;
  accentColor: string;
  fontFamily: "sans" | "serif" | "mono";
  headerLayout: "centered" | "left" | "minimal";
  customCss?: string;
}

export interface SubscriptionTier {
  id: string;
  publicationId: string;
  name: string;
  description: string;
  priceCents: number;
  currency: string; // "EUR"
  interval: BillingInterval;
  benefits: string[];
  stripePriceId?: string;
  isActive: boolean;
}

export interface PodcastMetadata {
  audioUrl: string;
  audioDurationSeconds: number;
  episodeNumber?: number;
  seasonNumber?: number;
  explicit: boolean;
  transcript?: string;
}

export interface PostAnalytics {
  views: number;
  uniqueViews: number;
  emailRecipients: number;
  emailOpens: number;
  emailClicks: number;
  openRatePercentage: number;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
}
