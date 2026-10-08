import type { MetadataRoute } from "next";
import { platformUrlFromEnv } from "@zerostack/shared";

export const dynamic = "force-dynamic";

/**
 * Solo le pagine della piattaforma: le pubblicazioni vivono sui loro sottodomini o domini, e una
 * sitemap può elencare solo indirizzi del proprio host.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = platformUrlFromEnv();
  return ["", "/notes", "/register", "/login", "/privacy", "/termini", "/cookie"].map((path) => ({ url: `${base}${path}` }));
}
