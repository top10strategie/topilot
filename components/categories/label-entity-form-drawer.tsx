"use client";

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { DrawerBody, DrawerFooterActions } from "@/components/drawers/drawer-section";
import type { DrawerHelpers } from "@/components/drawers/drawer-stack-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type LabelEntityResult = {
  id: string;
  label: string;
  is_private?: boolean;
};

type LabelEntityActionResult = {
  success: boolean;
  id?: string;
  label?: string;
  is_private?: boolean;
  error?: string;
  fieldErrors?: Partial<Record<"label", string>>;
};

type LabelEntityFormDrawerProps = {
  mode: "create" | "edit";
  entityId?: string;
  initialLabel?: string;
  initialIsPrivate?: boolean;
  entityKind: "category" | "category_business" | "document_type";
  /** Affiche le sélecteur Privé (Manager / Direction). */
  canManagePrivacy?: boolean;
  helpers: DrawerHelpers<LabelEntityResult>;
  onCreate: (label: string, isPrivate?: boolean) => Promise<LabelEntityActionResult>;
  onUpdate: (
    id: string,
    label: string,
    isPrivate?: boolean,
  ) => Promise<LabelEntityActionResult>;
};

const TITLES = {
  category: {
    createSuccess: "Catégorie créée.",
    updateSuccess: "Catégorie mise à jour.",
  },
  category_business: {
    createSuccess: "Catégorie métier créée.",
    updateSuccess: "Catégorie métier mise à jour.",
  },
  document_type: {
    createSuccess: "Type documentaire créé.",
    updateSuccess: "Type documentaire mis à jour.",
  },
} as const;

/**
 * Formulaire label (+ privé pour catégorie métier) pour catégorie ou type documentaire.
 */
export function LabelEntityFormDrawer({
  mode,
  entityId,
  initialLabel = "",
  initialIsPrivate = false,
  entityKind,
  canManagePrivacy = false,
  helpers,
  onCreate,
  onUpdate,
}: LabelEntityFormDrawerProps) {
  const [label, setLabel] = useState(initialLabel);
  const [isPrivate, setIsPrivate] = useState(
    canManagePrivacy ? Boolean(initialIsPrivate) : false,
  );
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();
  const submitLabel = mode === "create" ? "Créer" : "Enregistrer";
  const showPrivacy = entityKind === "category_business" && canManagePrivacy;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setFieldError(undefined);

    startTransition(async () => {
      const privacyArg = showPrivacy ? isPrivate : undefined;
      const result =
        mode === "create"
          ? await onCreate(label, privacyArg)
          : await onUpdate(entityId!, label, privacyArg);

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
      helpers.resolve({
        id: result.id,
        label: result.label,
        is_private: result.is_private,
      });
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <DrawerBody>
        <div className="space-y-4">
          {showPrivacy ? (
            <div className="flex items-center gap-2">
              <Label className="shrink-0">Privé</Label>
              <Select
                value={isPrivate ? "yes" : "no"}
                onValueChange={(value) => setIsPrivate(value === "yes")}
                disabled={isPending}
              >
                <SelectTrigger
                  className="w-[6.5rem] shrink-0"
                  aria-label="Catégorie privée"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Oui</SelectItem>
                  <SelectItem value="no">Non</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}

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
