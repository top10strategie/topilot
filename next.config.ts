import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  /**
   * jsdom / isomorphic-dompurify : externaliser pour Vercel.
   * Couplé à `overrides.jsdom = 25.0.1` — jsdom ≥28 tire @exodus/bytes (ESM-only)
   * et provoque ERR_REQUIRE_ESM sur le runtime serverless.
   */
  serverExternalPackages: ["jsdom", "isomorphic-dompurify"],
  experimental: {
    /** Aligné sur `DOCUMENT_MAX_BYTES` (devis / PDF) — les visuels restent limités côté app à 5 Mo. */
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
