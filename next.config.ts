import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  /** jsdom / isomorphic-dompurify : éviter le bundling Turbopack (ESM vs CJS sur Vercel). */
  serverExternalPackages: ["jsdom", "isomorphic-dompurify"],
  experimental: {
    /** Aligné sur `DOCUMENT_MAX_BYTES` (devis / PDF) — les visuels restent limités côté app à 5 Mo. */
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
