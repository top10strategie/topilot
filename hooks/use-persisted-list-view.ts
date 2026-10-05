"use client";

import { useCallback, useEffect, useState } from "react";

export type PersistedListView = "cards" | "table";

const STORAGE_PREFIX = "topilot:list-view:";

function readStoredView(storageKey: string): PersistedListView | null {
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (stored === "cards" || stored === "table") return stored;
  } catch {
    // stockage inaccessible (navigation privée, quota, etc.)
  }
  return null;
}

/**
 * Dernière vue Cartes/Tableau pour les listes sans paramètre URL `view`.
 * Missions et opportunités restent dans l’URL.
 */
export function usePersistedListView(
  pageKey: string,
  fallback: PersistedListView = "cards",
): [PersistedListView, (next: PersistedListView) => void] {
  const storageKey = `${STORAGE_PREFIX}${pageKey}`;
  const [view, setViewState] = useState<PersistedListView>(fallback);

  useEffect(() => {
    const stored = readStoredView(storageKey);
    if (stored) setViewState(stored);
  }, [storageKey]);

  const setView = useCallback(
    (next: PersistedListView) => {
      setViewState(next);
      try {
        window.localStorage.setItem(storageKey, next);
      } catch {
        // ignore
      }
    },
    [storageKey],
  );

  return [view, setView];
}
