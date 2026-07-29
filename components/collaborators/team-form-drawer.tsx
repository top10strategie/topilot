"use client";

import { useState, type FormEvent } from "react";
import { useTransition } from "react";
import { toast } from "sonner";
import { createTeam, updateTeam } from "@/actions/teams";
import type { DrawerHelpers } from "@/components/drawers/drawer-stack-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { TeamListItem } from "@/lib/collaborators/types";

type TeamFormDrawerProps = {
  mode: "create" | "edit";
  team?: Pick<TeamListItem, "id" | "team_name" | "notes">;
  helpers: DrawerHelpers<{ id: string; team_name: string }>;
};

/**
 * Formulaire création / édition d'un pôle.
 * Catégories (team_category) reportées — onglet Catégories encore placeholder.
 */
export function TeamFormDrawer({ mode, team, helpers }: TeamFormDrawerProps) {
  const [teamName, setTeamName] = useState(team?.team_name ?? "");
  const [notes, setNotes] = useState(team?.notes ?? "");
  const [fieldErrors, setFieldErrors] = useState<{
    team_name?: string;
    notes?: string;
  }>({});
  const [isPending, startTransition] = useTransition();

  const submitLabel = mode === "create" ? "Créer" : "Enregistrer";

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setFieldErrors({});

    startTransition(async () => {
      const input = {
        team_name: teamName,
        notes,
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

        <p className="text-xs text-muted-foreground">
          Les catégories de pôle seront disponibles après la gestion des
          catégories.
        </p>
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
