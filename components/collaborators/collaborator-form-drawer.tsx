"use client";

import { useState, useTransition, type FormEvent } from "react";
import { UserPlus } from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  createCollaborator,
  updateCollaborator,
} from "@/actions/collaborators";
import { DrawerBody, DrawerFooterActions } from "@/components/drawers/drawer-section";
import type { DrawerHelpers } from "@/components/drawers/drawer-stack-context";
import { useDrawerStack } from "@/components/drawers/drawer-stack-context";
import { TeamFormDrawer } from "@/components/collaborators/team-form-drawer";
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
import { VisualFileField } from "@/components/visuels/visual-file-field";
import {
  getCollaboratorRoleLabel,
  getCollaboratorStatusLabel,
} from "@/lib/collaborators/labels";
import type { CategoryItem } from "@/lib/categories/types";
import type {
  CollaboratorListItem,
  CollaboratorRole,
  CollaboratorStatus,
  TeamListItem,
} from "@/lib/collaborators/types";

type TeamOption = Pick<TeamListItem, "id" | "team_name">;

type CollaboratorFormDrawerProps = {
  mode: "create" | "edit";
  collaborator?: CollaboratorListItem;
  teams: TeamOption[];
  availableCategories?: CategoryItem[];
  helpers: DrawerHelpers<{ id: string }>;
};

const ROLES: CollaboratorRole[] = ["direction", "manager", "collaborator"];
const STATUSES: CollaboratorStatus[] = ["actif", "inactif", "sorti"];

export function CollaboratorFormDrawer({
  mode,
  collaborator,
  teams: initialTeams,
  availableCategories = [],
  helpers,
}: CollaboratorFormDrawerProps) {
  const { pushDrawer } = useDrawerStack();
  const [teams, setTeams] = useState(initialTeams);
  const [firstName, setFirstName] = useState(collaborator?.first_name ?? "");
  const [lastName, setLastName] = useState(collaborator?.last_name ?? "");
  const [email, setEmail] = useState(collaborator?.email ?? "");
  const [role, setRole] = useState<CollaboratorRole>(
    collaborator?.role ?? "collaborator",
  );
  const [status, setStatus] = useState<CollaboratorStatus>(
    collaborator?.status ?? "actif",
  );
  const [teamId, setTeamId] = useState(collaborator?.team_id ?? "");
  const [jobTitle, setJobTitle] = useState(collaborator?.job_title ?? "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<string, string>>
  >({});
  const [isPending, startTransition] = useTransition();

  const submitLabel = mode === "create" ? "Créer" : "Enregistrer";

  const openCreateTeam = async () => {
    const created = await pushDrawer<{ id: string; team_name: string }>({
      title: "Nouveau Pôle",
      content: (nestedHelpers) => (
        <TeamFormDrawer
          mode="create"
          helpers={nestedHelpers}
          availableCategories={availableCategories}
        />
      ),
    });
    if (created) {
      setTeams((prev) => {
        if (prev.some((team) => team.id === created.id)) {
          return prev;
        }
        return [...prev, { id: created.id, team_name: created.team_name }].sort(
          (a, b) => a.team_name.localeCompare(b.team_name, "fr"),
        );
      });
      setTeamId(created.id);
      toast.success("Pôle créé et sélectionné.");
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setFieldErrors({});

    startTransition(async () => {
      const formData = new FormData();
      formData.set("first_name", firstName);
      formData.set("last_name", lastName);
      formData.set("email", email);
      formData.set("role", role);
      formData.set("status", status);
      formData.set("team_id", teamId);
      formData.set("job_title", jobTitle);
      if (avatarFile) {
        formData.set("avatar", avatarFile);
      }

      const result =
        mode === "create"
          ? await createCollaborator(formData)
          : await updateCollaborator(collaborator!.id, formData);

      if (!result.success) {
        setFieldErrors(result.fieldErrors ?? {});
        toast.error(result.error);
        return;
      }

      toast.success(
        mode === "create"
          ? "Collaborateur créé — invitation envoyée par email."
          : "Collaborateur mis à jour.",
      );
      helpers.resolve({ id: result.id });
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <DrawerBody>
        <VisualFileField
          id="collaborator_avatar"
          label="Avatar"
          value={avatarFile}
          existingUrl={collaborator?.profile_picture_url}
          onChange={setAvatarFile}
          disabled={isPending}
          error={fieldErrors.avatar}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="last_name">
              Nom <span className="text-destructive">*</span>
            </Label>
            <Input
              id="last_name"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              disabled={isPending}
              required
              aria-invalid={Boolean(fieldErrors.last_name)}
            />
            {fieldErrors.last_name ? (
              <p className="text-sm text-destructive">{fieldErrors.last_name}</p>
            ) : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="first_name">
              Prénom <span className="text-destructive">*</span>
            </Label>
            <Input
              id="first_name"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              disabled={isPending}
              required
              autoFocus
              aria-invalid={Boolean(fieldErrors.first_name)}
            />
            {fieldErrors.first_name ? (
              <p className="text-sm text-destructive">{fieldErrors.first_name}</p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="email">
            Email <span className="text-destructive">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={isPending}
            required
            aria-invalid={Boolean(fieldErrors.email)}
          />
          {fieldErrors.email ? (
            <p className="text-sm text-destructive">{fieldErrors.email}</p>
          ) : mode === "create" ? (
            <p className="text-xs text-muted-foreground">
              Une invitation Supabase Auth sera envoyée à cette adresse.
            </p>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>
              Rôle <span className="text-destructive">*</span>
            </Label>
            <Select
              value={role}
              onValueChange={(value) => setRole(value as CollaboratorRole)}
              disabled={isPending}
            >
              <SelectTrigger className="w-full" aria-invalid={Boolean(fieldErrors.role)}>
                <SelectValue placeholder="Choisir un rôle" />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {getCollaboratorRoleLabel(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.role ? (
              <p className="text-sm text-destructive">{fieldErrors.role}</p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label>
              Statut <span className="text-destructive">*</span>
            </Label>
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as CollaboratorStatus)}
              disabled={isPending}
            >
              <SelectTrigger
                className="w-full"
                aria-invalid={Boolean(fieldErrors.status)}
              >
                <SelectValue placeholder="Choisir un statut" />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {getCollaboratorStatusLabel(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.status ? (
              <p className="text-sm text-destructive">{fieldErrors.status}</p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-2">
          <Label>
            Pôle <span className="text-destructive">*</span>
          </Label>
          <div className="flex gap-2">
            <Select
              value={teamId || undefined}
              onValueChange={setTeamId}
              disabled={isPending}
            >
              <SelectTrigger
                className="w-full"
                aria-invalid={Boolean(fieldErrors.team_id)}
              >
                <SelectValue placeholder="Choisir un pôle" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.team_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              aria-label="Ajouter un pôle"
              onClick={() => void openCreateTeam()}
              disabled={isPending}
            >
              <UserPlus className="size-4" />
            </Button>
          </div>
          {fieldErrors.team_id ? (
            <p className="text-sm text-destructive">{fieldErrors.team_id}</p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="job_title">
            Poste <span className="text-destructive">*</span>
          </Label>
          <Input
            id="job_title"
            value={jobTitle}
            onChange={(event) => setJobTitle(event.target.value)}
            disabled={isPending}
            required
            aria-invalid={Boolean(fieldErrors.job_title)}
          />
          {fieldErrors.job_title ? (
            <p className="text-sm text-destructive">{fieldErrors.job_title}</p>
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
