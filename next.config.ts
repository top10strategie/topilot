import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
  : "";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  `img-src 'self' data: blob:${supabaseHost ? ` ${supabaseHost}` : ""}`,
  `connect-src 'self'${supabaseHost ? ` ${supabaseHost} ${supabaseHost.replace("https://", "wss://")}` : ""}`,
  "worker-src 'self' blob:",
].join("; ");

const nextConfig: NextConfig = {
  cacheComponents: true,
  /**
   * jsdom / isomorphic-dompurify : externaliser pour Vercel.
   * Couplé à `overrides.jsdom = 25.0.1` — jsdom ≥28 tire @exodus/bytes (ESM-only)
   * et provoque ERR_REQUIRE_ESM sur le runtime serverless.
   */
  serverExternalPackages: ["jsdom", "isomorphic-dompurify"],
  experimental: {
    /**
     * Limite volontairement haute : alignée sur DOCUMENT_MAX_BYTES (50 Mo)
     * pour les uploads devis / PDF. Les visuels restent plafonnés à 5 Mo côté app.
     */
    serverActions: {
      bodySizeLimit: "50mb",
    },
    optimizePackageImports: ["@phosphor-icons/react"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
