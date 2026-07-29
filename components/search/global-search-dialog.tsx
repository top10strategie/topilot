"use client";

import { searchGlobalAction } from "@/actions/search";
import { useGlobalSearch } from "@/components/search/global-search-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  getSearchEntityLabel,
  getSearchResultHref,
  type GlobalSearchResult,
  type SearchEntityType,
} from "@/lib/search/types";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 250;

function groupResults(
  results: GlobalSearchResult[],
): Array<[SearchEntityType, GlobalSearchResult[]]> {
  const map = new Map<SearchEntityType, GlobalSearchResult[]>();
  for (const result of results) {
    const list = map.get(result.entity_type) ?? [];
    list.push(result);
    map.set(result.entity_type, list);
  }
  return Array.from(map.entries());
}

export function GlobalSearchDialog() {
  const { open, setOpen } = useGlobalSearch();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      setQuery("");
      setDebouncedQuery("");
      setResults([]);
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    const trimmed = query.trim();
    const timer = window.setTimeout(() => {
      setDebouncedQuery(trimmed);
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let cancelled = false;

    if (debouncedQuery.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setError(null);
      return;
    }

    startTransition(async () => {
      try {
        const response = await searchGlobalAction(debouncedQuery);
        if (cancelled) {
          return;
        }
        setResults(response.results);
        setError(response.error ?? null);
      } catch (err) {
        if (cancelled) {
          return;
        }
        console.error("GlobalSearchDialog:", err);
        setResults([]);
        setError(
          err instanceof Error
            ? err.message
            : "Impossible d'effectuer la recherche.",
        );
      }
    });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const grouped = useMemo(() => groupResults(results), [results]);

  const trimmedQuery = query.trim();
  const isWaitingDebounce =
    trimmedQuery.length >= MIN_QUERY_LENGTH &&
    trimmedQuery !== debouncedQuery;
  const isSearching = isPending || isWaitingDebounce;

  const handleSelect = (result: GlobalSearchResult) => {
    setOpen(false);
    router.push(getSearchResultHref(result));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="px-4 py-3 text-left">
          <DialogTitle>Recherche</DialogTitle>
          <DialogDescription className="sr-only">
            Recherche transverse sur les entités du CRM
          </DialogDescription>
        </DialogHeader>
        <div className="px-4 py-3">
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher un client, une mission…"
            aria-label="Requête de recherche"
          />
        </div>
        <div className="max-h-80 overflow-y-auto px-2 py-2">
          {trimmedQuery.length < MIN_QUERY_LENGTH ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              Saisissez au moins 2 caractères.
            </p>
          ) : isSearching ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              Recherche…
            </p>
          ) : error ? (
            <p className="px-2 py-6 text-center text-sm text-destructive">
              Impossible d&apos;effectuer la recherche.
            </p>
          ) : results.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              Aucun résultat.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {grouped.map(([entityType, items]) => (
                <div key={entityType}>
                  <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">
                    {getSearchEntityLabel(entityType)}
                  </p>
                  <ul className="flex flex-col gap-0.5">
                    {items.map((item) => (
                      <li key={`${item.entity_type}-${item.entity_id}`}>
                        <button
                          type="button"
                          className="flex w-full flex-col rounded-md px-2 py-2 text-left hover:bg-accent"
                          onClick={() => handleSelect(item)}
                        >
                          <span className="text-sm font-medium">
                            {item.title}
                          </span>
                          {item.subtitle ? (
                            <span className="text-xs text-muted-foreground">
                              {item.subtitle}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
