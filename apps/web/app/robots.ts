import type { MetadataRoute } from "next";
import { platformUrlFromEnv } from "@zerostack/shared";

export const dynamic = "force-dynamic";

/** Le aree private restano fuori; la pagina di cortesia ha già noindex per conto suo. */
export default function robots(): MetadataRoute.Robots {
  const base = platformUrlFromEnv();
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/studio", "/account", "/admin", "/inbox", "/checkout", "/invito", "/reset-password"] }],
    sitemap: `${base}/sitemap.xml`
  };
}
