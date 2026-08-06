import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitise le HTML wiki (TipTap) avant stockage ou affichage.
 * Autorise le markup éditorial courant ; bloque scripts / handlers.
 */
export function sanitizeWikiHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ["target", "rel"],
  });
}
