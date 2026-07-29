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
import { useDeferredValue, useEffect, useMemo, useState } from "react";

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
  const deferredQuery = useDeferredValue(query);
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const trimmed = deferredQuery.trim();
      if (trimmed.length < 2) {
        setResults([]);
        setError(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const response = await searchGlobalAction(trimmed);
      if (cancelled) {
        return;
      }
      setResults(response.results);
      setError(response.error ?? null);
      setIsLoading(false);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [deferredQuery]);

  const grouped = useMemo(() => groupResults(results), [results]);

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
          {query.trim().length < 2 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              Saisissez au moins 2 caractères.
            </p>
          ) : isLoading ? (
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
