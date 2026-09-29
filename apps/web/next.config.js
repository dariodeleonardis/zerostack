/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  // instrumentation.ts: segnalazione degli errori lato server (stabile solo da Next 15)
  experimental: { instrumentationHook: true },
  transpilePackages: ["@zerostack/shared", "@zerostack/database", "@zerostack/email"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**"
      }
    ]
  }
};

module.exports = nextConfig;
