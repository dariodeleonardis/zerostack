type Env = Record<string, string | undefined>;

export function rootDomainFromEnv(env: Env = process.env): string {
  return (env.APP_DOMAIN || env.NEXT_PUBLIC_ROOT_DOMAIN || "zerostack.it").toLowerCase();
}

/** Indirizzo della piattaforma (API, disiscrizioni): APP_URL se c'è, altrimenti https://<dominio>. */
export function platformUrlFromEnv(env: Env = process.env): string {
  return (env.APP_URL || `https://${rootDomainFromEnv(env)}`).replace(/\/+$/, "");
}

/** Home pubblica di una pubblicazione: il dominio personalizzato se verificato, se no slug.<dominio>. */
export function publicationBaseUrl(
  publication: { slug: string; customDomain?: string | null; isDomainVerified?: boolean | null },
  env: Env = process.env
): string {
  if (publication.customDomain && publication.isDomainVerified) return `https://${publication.customDomain}`;
  return `https://${publication.slug}.${rootDomainFromEnv(env)}`;
}
