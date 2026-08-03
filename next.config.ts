import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  experimental: {
    /** Aligné sur `DOCUMENT_MAX_BYTES` (devis / PDF) — les visuels restent limités côté app à 5 Mo. */
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
