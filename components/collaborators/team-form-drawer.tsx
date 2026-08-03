"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { FolderSimplePlus } from "@phosphor-icons/react";
import { toast } from "sonner";
import { createCategory, updateCategory } from "@/actions/categories";
import { createTeam, updateTeam } from "@/actions/teams";
import { CategoryMultiCombobox } from "@/components/categories/category-multi-combobox";
import { LabelEntityFormDrawer } from "@/components/categories/label-entity-form-drawer";
import { DrawerBody, DrawerFooterActions } from "@/components/drawers/drawer-section";
import type { DrawerHelpers } from "@/components/drawers/drawer-stack-context";
import { useDrawerStack } from "@/components/drawers/drawer-stack-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CategoryItem } from "@/lib/categories/types";
import type {
  TeamCategoryItem,
  TeamListItem,
} from "@/lib/collaborators/types";

type TeamFormDrawerProps = {
  mode: "create" | "edit";
  team?: Pick<TeamListItem, "id" | "team_name" | "notes" | "categories">;
  helpers: DrawerHelpers<{ id: string; team_name: string }>;
  /** Catalogue des catégories (peut être enrichi via tiroir empilé). */
  availableCategories?: CategoryItem[];
};

/**
 * Formulaire création / édition d'un pôle (nom, catégories, notes).
 */
export function TeamFormDrawer({
  mode,
  team,
  helpers,
  availableCategories = [],
}: TeamFormDrawerProps) {
  const { pushDrawer } = useDrawerStack();
  const categoriesFieldId = useId();
  const [teamName, setTeamName] = useState(team?.team_name ?? "");
  const [notes, setNotes] = useState(team?.notes ?? "");
  const [categories, setCategories] = useState<TeamCategoryItem[]>(() => {
    const byId = new Map<string, TeamCategoryItem>();
    for (const item of availableCategories) {
      byId.set(item.id, item);
    }
    for (const item of team?.categories ?? []) {
      byId.set(item.id, item);
    }
    return [...byId.values()].sort((a, b) =>
      a.label.localeCompare(b.label, "fr"),
    );
  });
  const [selected, setSelected] = useState<TeamCategoryItem[]>(
    () => [...(team?.categories ?? [])],
  );
  const [fieldErrors, setFieldErrors] = useState<{
    team_name?: string;
    notes?: string;
    category_ids?: string;
  }>({});
  const [isPending, startTransition] = useTransition();

  const submitLabel = mode === "create" ? "Créer" : "Enregistrer";

  const injectCategory = (item: TeamCategoryItem) => {
    setCategories((prev) => {
      if (prev.some((c) => c.id === item.id)) {
        return prev;
      }
      return [...prev, item].sort((a, b) =>
        a.label.localeCompare(b.label, "fr"),
      );
    });
    setSelected((prev) => {
      if (prev.some((c) => c.id === item.id)) {
        return prev;
      }
      return [...prev, item];
    });
  };

  const openCreateCategory = async () => {
    const created = await pushDrawer<{ id: string; label: string }>({
      title: "Nouvelle catégorie",
      content: (nestedHelpers) => (
        <LabelEntityFormDrawer
          mode="create"
          entityKind="category"
          helpers={{
            dismiss: nestedHelpers.dismiss,
            resolve: (value) => {
              injectCategory(value);
              nestedHelpers.resolve(value);
            },
          }}
          onCreate={createCategory}
          onUpdate={updateCategory}
        />
      ),
    });

    if (created) {
      injectCategory(created);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setFieldErrors({});

    startTransition(async () => {
      const input = {
        team_name: teamName,
        notes,
        category_ids: selected.map((category) => category.id),
      };

      const result =
        mode === "create"
          ? await createTeam(input)
          : await updateTeam(team!.id, input);

      if (!result.success) {
        setFieldErrors(result.fieldErrors ?? {});
        toast.error(result.error);
        return;
      }

      toast.success(
        mode === "create" ? "Pôle créé." : "Pôle mis à jour.",
      );
      helpers.resolve({ id: result.id, team_name: teamName.trim() });
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <DrawerBody>
        <div className="grid gap-2">
          <Label htmlFor="team_name">
            Nom <span className="text-destructive">*</span>
          </Label>
          <Input
            id="team_name"
            value={teamName}
            onChange={(event) => setTeamName(event.target.value)}
            disabled={isPending}
            required
            autoFocus
            aria-invalid={Boolean(fieldErrors.team_name)}
          />
          {fieldErrors.team_name ? (
            <p className="text-sm text-destructive">{fieldErrors.team_name}</p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor={categoriesFieldId}>Catégories</Label>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Nouvelle catégorie"
              title="Nouvelle catégorie"
              disabled={isPending}
              onClick={() => void openCreateCategory()}
            >
              <FolderSimplePlus className="size-4" />
            </Button>
          </div>

          <CategoryMultiCombobox
            id={categoriesFieldId}
            items={categories}
            value={selected}
            onValueChange={setSelected}
            disabled={isPending}
            aria-invalid={Boolean(fieldErrors.category_ids)}
            emptyListMessage="Aucune catégorie. Créez-en une avec le bouton ci-dessus."
          />
          {fieldErrors.category_ids ? (
            <p className="text-sm text-destructive">
              {fieldErrors.category_ids}
            </p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="team_notes">Notes</Label>
          <Textarea
            id="team_notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            disabled={isPending}
            rows={5}
            placeholder="Notes internes sur le pôle…"
          />
          {fieldErrors.notes ? (
            <p className="text-sm text-destructive">{fieldErrors.notes}</p>
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
