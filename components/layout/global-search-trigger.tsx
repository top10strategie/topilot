"use client";

import { useGlobalSearch } from "@/components/search/global-search-context";
import { Button } from "@/components/ui/button";
import { Flashlight } from "@phosphor-icons/react";

type GlobalSearchTriggerProps = {
  withLabel?: boolean;
};

export function GlobalSearchTrigger({
  withLabel = false,
}: GlobalSearchTriggerProps) {
  const { openSearch } = useGlobalSearch();

  if (withLabel) {
    return (
      <Button
        type="button"
        variant="ghost"
        className="w-full justify-start gap-2"
        onClick={openSearch}
      >
        <Flashlight className="size-5" />
        Recherche
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Recherche globale"
      onClick={openSearch}
    >
      <Flashlight className="size-5" />
    </Button>
  );
}
