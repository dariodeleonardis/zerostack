/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  // instrumentation.ts: segnalazione degli errori lato server (stabile solo da Next 15)
  experimental: { instrumentationHook: true },
  transpilePackages: ["@zerostack/shared", "@zerostack/database", "@zerostack/email"],
  poweredByHeader: false,
  // Nessuna pagina usa next/image: senza remotePatterns /_next/image non fa da proxy per
  // immagini di qualunque sito (prima rispondeva 200 anche per google.com).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Senza includeSubDomains: i domini degli autori e i sottodomini non dipendono da questa regola.
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" }
        ]
      }
    ];
  }
};

module.exports = nextConfig;
