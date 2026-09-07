import "server-only";

import DOMPurify from "isomorphic-dompurify";
import { WIKI_DOMPURIFY_CONFIG } from "@/lib/wiki/sanitize-config";

/**
 * Sanitise le HTML wiki (TipTap) avant stockage.
 * Réservé au serveur (`isomorphic-dompurify` / jsdom — incompatible SSR client sur Vercel).
 */
export function sanitizeWikiHtml(html: string): string {
  return DOMPurify.sanitize(html, WIKI_DOMPURIFY_CONFIG);
}
