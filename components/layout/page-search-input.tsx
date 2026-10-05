"use client";

import { useEffect, useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PageSearchInputProps = {
  value: string;
  onSearch: (query: string) => void;
  "aria-label": string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
};

/**
 * Recherche de page : la saisie reste locale jusqu’à Entrée.
 */
export function PageSearchInput({
  value,
  onSearch,
  "aria-label": ariaLabel,
  disabled,
  placeholder = "Rechercher…",
  className,
}: PageSearchInputProps) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  return (
    <form
      className={cn(
        "relative min-w-0",
        className ??
          "flex-1 basis-full sm:basis-auto md:w-72 md:flex-none lg:w-80",
      )}
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(draft.trim());
      }}
    >
      <MagnifyingGlass
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        type="search"
        name="page-search"
        placeholder={placeholder}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && event.nativeEvent.isComposing) {
            event.preventDefault();
          }
        }}
        className="pl-8"
        aria-label={ariaLabel}
        disabled={disabled}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        data-1p-ignore
        data-lpignore="true"
        data-form-type="other"
      />
    </form>
  );
}
