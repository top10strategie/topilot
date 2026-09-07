"use client";

import { useEffect, useState } from "react";
import DOMPurify from "dompurify";
import { WIKI_DOMPURIFY_CONFIG } from "@/lib/wiki/sanitize-config";

/**
 * Sanitisation navigateur uniquement (pas de jsdom).
 * Contenu déjà passé par `sanitizeWikiHtml` à l'écriture — défense en profondeur à l'affichage.
 */
export function useSanitizedWikiHtml(html: string): string {
  const [clean, setClean] = useState("");

  useEffect(() => {
    setClean(DOMPurify.sanitize(html, WIKI_DOMPURIFY_CONFIG));
  }, [html]);

  return clean;
}
