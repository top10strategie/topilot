"use client";

import type { RefObject } from "react";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import { cn } from "@/lib/utils";

export type CategoryComboboxItem = {
  id: string;
  label: string;
};

type CategoryMultiComboboxProps = {
  items: CategoryComboboxItem[];
  value: CategoryComboboxItem[];
  onValueChange: (value: CategoryComboboxItem[]) => void;
  disabled?: boolean;
  id?: string;
  placeholder?: string;
  emptyListMessage?: string;
  emptySearchMessage?: string;
  className?: string;
  "aria-invalid"?: boolean;
  /** Conteneur de portal (tiroir / dialog modal) pour rester cliquable. */
  container?: HTMLElement | RefObject<HTMLElement | null> | null;
};

/**
 * Multi-sélection de catégories (Combobox + chips), partagée formulaires / filtres.
 */
export function CategoryMultiCombobox({
  items,
  value,
  onValueChange,
  disabled = false,
  id,
  placeholder = "Sélectionner des catégories…",
  emptyListMessage = "Aucune catégorie.",
  emptySearchMessage = "Aucune catégorie trouvée.",
  className,
  "aria-invalid": ariaInvalid,
  container,
}: CategoryMultiComboboxProps) {
  const chipsAnchor = useComboboxAnchor();

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{emptyListMessage}</p>
    );
  }

  return (
    <Combobox
      items={items}
      multiple
      value={value}
      onValueChange={(next) => onValueChange(next ?? [])}
      itemToStringLabel={(item) => item.label}
      itemToStringValue={(item) => item.id}
      isItemEqualToValue={(a, b) => a.id === b.id}
      disabled={disabled}
    >
      <ComboboxChips
        ref={chipsAnchor}
        aria-invalid={ariaInvalid || undefined}
        className={cn("w-full", className)}
      >
        <ComboboxValue>
          {(selected: CategoryComboboxItem[]) => (
            <>
              {selected.map((item) => (
                <ComboboxChip key={item.id}>{item.label}</ComboboxChip>
              ))}
              <ComboboxChipsInput
                id={id}
                placeholder={
                  selected.length > 0 ? "Ajouter…" : placeholder
                }
                disabled={disabled}
              />
            </>
          )}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent anchor={chipsAnchor} container={container}>
        <ComboboxEmpty>{emptySearchMessage}</ComboboxEmpty>
        <ComboboxList>
          {(item) => (
            <ComboboxItem key={item.id} value={item}>
              {item.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
