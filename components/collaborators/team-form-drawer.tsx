"use client";

import { useState, type FormEvent } from "react";
import { useTransition } from "react";
import { FolderSimplePlus } from "@phosphor-icons/react";
import { toast } from "sonner";
import { createCategory, updateCategory } from "@/actions/categories";
import { createTeam, updateTeam } from "@/actions/teams";
import { LabelEntityFormDrawer } from "@/components/categories/label-entity-form-drawer";
import type { DrawerHelpers } from "@/components/drawers/drawer-stack-context";
import { useDrawerStack } from "@/components/drawers/drawer-stack-context";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set((team?.categories ?? []).map((c) => c.id)),
  );
  const [fieldErrors, setFieldErrors] = useState<{
    team_name?: string;
    notes?: string;
    category_ids?: string;
  }>({});
  const [isPending, startTransition] = useTransition();

  const submitLabel = mode === "create" ? "Créer" : "Enregistrer";

  const toggleCategory = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const openCreateCategory = async () => {
    const created = await pushDrawer<{ id: string; label: string }>({
      title: "Nouvelle catégorie",
      content: (nestedHelpers) => (
        <LabelEntityFormDrawer
          mode="create"
          entityKind="category"
          helpers={nestedHelpers}
          onCreate={createCategory}
          onUpdate={updateCategory}
        />
      ),
    });

    if (!created) {
      return;
    }

    setCategories((prev) => {
      if (prev.some((c) => c.id === created.id)) {
        return prev;
      }
      return [...prev, created].sort((a, b) =>
        a.label.localeCompare(b.label, "fr"),
      );
    });
    setSelectedIds((prev) => new Set(prev).add(created.id));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setFieldErrors({});

    startTransition(async () => {
      const input = {
        team_name: teamName,
        notes,
        category_ids: [...selectedIds],
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
      <div className="flex-1 space-y-4">
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
            <Label>Catégories</Label>
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
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune catégorie. Créez-en une avec le bouton ci-dessus.
            </p>
          ) : (
            <ul className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-3">
              {categories.map((category) => {
                const checked = selectedIds.has(category.id);
                const checkboxId = `team-category-${category.id}`;
                return (
                  <li key={category.id} className="flex items-center gap-2">
                    <Checkbox
                      id={checkboxId}
                      checked={checked}
                      disabled={isPending}
                      onCheckedChange={(value) =>
                        toggleCategory(category.id, value === true)
                      }
                    />
                    <Label
                      htmlFor={checkboxId}
                      className="cursor-pointer font-normal"
                    >
                      {category.label}
                    </Label>
                  </li>
                );
              })}
            </ul>
          )}
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
      </div>

      <div className="mt-6 flex shrink-0 justify-end gap-2 border-t pt-4">
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
      </div>
    </form>
  );
}
