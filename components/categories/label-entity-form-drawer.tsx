"use client";

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { DrawerBody, DrawerFooterActions } from "@/components/drawers/drawer-section";
import type { DrawerHelpers } from "@/components/drawers/drawer-stack-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type LabelEntityResult = { id: string; label: string };

type LabelEntityFormDrawerProps = {
  mode: "create" | "edit";
  entityId?: string;
  initialLabel?: string;
  entityKind: "category" | "document_type";
  helpers: DrawerHelpers<LabelEntityResult>;
  onCreate: (label: string) => Promise<{
    success: boolean;
    id?: string;
    label?: string;
    error?: string;
    fieldErrors?: Partial<Record<"label", string>>;
  }>;
  onUpdate: (
    id: string,
    label: string,
  ) => Promise<{
    success: boolean;
    id?: string;
    label?: string;
    error?: string;
    fieldErrors?: Partial<Record<"label", string>>;
  }>;
};

const TITLES = {
  category: {
    createSuccess: "Catégorie créée.",
    updateSuccess: "Catégorie mise à jour.",
  },
  document_type: {
    createSuccess: "Type documentaire créé.",
    updateSuccess: "Type documentaire mis à jour.",
  },
} as const;

/**
 * Formulaire à un champ `label` pour catégorie ou type documentaire.
 */
export function LabelEntityFormDrawer({
  mode,
  entityId,
  initialLabel = "",
  entityKind,
  helpers,
  onCreate,
  onUpdate,
}: LabelEntityFormDrawerProps) {
  const [label, setLabel] = useState(initialLabel);
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();
  const submitLabel = mode === "create" ? "Créer" : "Enregistrer";

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setFieldError(undefined);

    startTransition(async () => {
      const result =
        mode === "create"
          ? await onCreate(label)
          : await onUpdate(entityId!, label);

      if (!result.success || !result.id || !result.label) {
        setFieldError(result.fieldErrors?.label);
        toast.error(result.error ?? "Enregistrement impossible.");
        return;
      }

      toast.success(
        mode === "create"
          ? TITLES[entityKind].createSuccess
          : TITLES[entityKind].updateSuccess,
      );
      helpers.resolve({ id: result.id, label: result.label });
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <DrawerBody>
        <div className="grid gap-2">
          <Label htmlFor="entity_label">
            Titre <span className="text-destructive">*</span>
          </Label>
          <Input
            id="entity_label"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            disabled={isPending}
            required
            autoFocus
            aria-invalid={Boolean(fieldError)}
          />
          {fieldError ? (
            <p className="text-sm text-destructive">{fieldError}</p>
          ) : null}
        </div>
      </DrawerBody>

      <DrawerFooterActions>
        <Button
          type="button"
          variant="outline"
          onClick={() => helpers.dismiss()}
          disabled={isPending}
        >
          Annuler
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Enregistrement…" : submitLabel}
        </Button>
      </DrawerFooterActions>
    </form>
  );
}
