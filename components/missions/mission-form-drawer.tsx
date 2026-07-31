"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { Buildings, FolderSimplePlus } from "@phosphor-icons/react";
import { toast } from "sonner";
import { createCategory, updateCategory } from "@/actions/categories";
import {
  createMissionRecord,
  updateMissionRecord,
} from "@/actions/missions";
import { CategoryMultiCombobox } from "@/components/categories/category-multi-combobox";
import { LabelEntityFormDrawer } from "@/components/categories/label-entity-form-drawer";
import { ClientFormDrawer } from "@/components/clients/client-form-drawer";
import type { DrawerHelpers } from "@/components/drawers/drawer-stack-context";
import { useDrawerStack } from "@/components/drawers/drawer-stack-context";
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
import { Textarea } from "@/components/ui/textarea";
import type { CategoryItem } from "@/lib/categories/types";
import { getCollaboratorFullName } from "@/lib/collaborators/labels";
import type { CollaboratorListItem } from "@/lib/collaborators/types";
import type { ClientListItem } from "@/lib/clients/types";
import {
  getMissionKanbanStatusLabel,
  MISSION_KANBAN_STATUSES,
} from "@/lib/missions/labels";
import type {
  MissionCategoryItem,
  MissionDetail,
  MissionKanbanStatus,
  MissionOpportunityOption,
  MissionScope,
} from "@/lib/missions/types";

type MissionFormDrawerProps = {
  mode: "create" | "edit";
  mission?: MissionDetail;
  collaborators: CollaboratorListItem[];
  clients: ClientListItem[];
  availableCategories: CategoryItem[];
  opportunityOptions: MissionOpportunityOption[];
  currentCollaboratorId: string;
  helpers: DrawerHelpers<{ id: string; mission_name: string }>;
  /** Verrouillage FK phase C */
  lockedFields?: {
    mission_scope?: MissionScope;
    client_id?: string;
    opportunity_id?: string;
  };
};

type LocalClient = Pick<ClientListItem, "id" | "client_name">;

/**
 * Tiroir Nouvelle mission (création 2 temps) / Édition (save unique).
 */
export function MissionFormDrawer({
  mode,
  mission,
  collaborators,
  clients: initialClients,
  availableCategories = [],
  opportunityOptions,
  currentCollaboratorId,
  helpers,
  lockedFields,
}: MissionFormDrawerProps) {
  const { pushDrawer } = useDrawerStack();

  const lockedScope = lockedFields?.mission_scope;
  const lockedClientId = lockedFields?.client_id;
  const lockedOpportunityId = lockedFields?.opportunity_id;

  const activeCollaborators = useMemo(
    () =>
      collaborators
        .filter((c) => c.status === "actif")
        .sort((a, b) =>
          getCollaboratorFullName(a).localeCompare(
            getCollaboratorFullName(b),
            "fr",
          ),
        ),
    [collaborators],
  );

  const [missionId, setMissionId] = useState(mission?.id ?? "");
  const [identificationSaved, setIdentificationSaved] = useState(
    mode === "edit",
  );

  const [missionName, setMissionName] = useState(mission?.mission_name ?? "");
  const [isInterne, setIsInterne] = useState(
    () => (lockedScope ?? mission?.mission_scope ?? "client") === "interne",
  );
  const [clientId, setClientId] = useState(
    lockedClientId ?? mission?.client_id ?? "",
  );
  const [responsibleId, setResponsibleId] = useState(
    mission?.collaborator_id ?? currentCollaboratorId,
  );
  const [opportunityId, setOpportunityId] = useState(
    lockedOpportunityId ?? mission?.opportunity_id ?? "",
  );
  const [estimatedCharge, setEstimatedCharge] = useState(
    mission?.estimated_charge != null ? String(mission.estimated_charge) : "",
  );
  const [kanbanStatus, setKanbanStatus] = useState<MissionKanbanStatus>(
    mission?.kanban_status ?? "a_faire",
  );
  const [startAt, setStartAt] = useState(mission?.start_at ?? "");
  const [endAt, setEndAt] = useState(mission?.end_at ?? "");
  const [notes, setNotes] = useState(mission?.notes ?? "");

  const [clients, setClients] = useState<LocalClient[]>(() =>
    [...initialClients]
      .map((c) => ({ id: c.id, client_name: c.client_name }))
      .sort((a, b) => a.client_name.localeCompare(b.client_name, "fr")),
  );

  const [categories, setCategories] = useState<MissionCategoryItem[]>(() => {
    const byId = new Map<string, MissionCategoryItem>();
    for (const item of availableCategories) byId.set(item.id, item);
    for (const item of mission?.categories ?? []) byId.set(item.id, item);
    return [...byId.values()].sort((a, b) =>
      a.label.localeCompare(b.label, "fr"),
    );
  });
  const [selectedCategories, setSelectedCategories] = useState<
    MissionCategoryItem[]
  >(() => [...(mission?.categories ?? [])]);

  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<string, string>>
  >({});
  const [isPending, startTransition] = useTransition();

  const missionScope: MissionScope = lockedScope
    ? lockedScope
    : isInterne
      ? "interne"
      : "client";

  const filteredOpportunities = useMemo(() => {
    if (missionScope === "interne") return [];
    const cid = lockedClientId ?? clientId;
    if (!cid) return [];
    return opportunityOptions
      .filter((o) => o.client_id === cid)
      .sort((a, b) =>
        a.opportunity_name.localeCompare(b.opportunity_name, "fr"),
      );
  }, [missionScope, lockedClientId, clientId, opportunityOptions]);

  const injectCategory = (item: MissionCategoryItem) => {
    setCategories((prev) => {
      if (prev.some((c) => c.id === item.id)) return prev;
      return [...prev, item].sort((a, b) =>
        a.label.localeCompare(b.label, "fr"),
      );
    });
    setSelectedCategories((prev) => {
      if (prev.some((c) => c.id === item.id)) return prev;
      return [...prev, item];
    });
  };

  const openCreateCategory = async () => {
    const created = await pushDrawer<{ id: string; label: string }>({
      title: "Nouvelle catégorie",
      content: (nested) => (
        <LabelEntityFormDrawer
          mode="create"
          entityKind="category"
          helpers={{
            dismiss: nested.dismiss,
            resolve: (value) => {
              injectCategory(value);
              nested.resolve(value);
            },
          }}
          onCreate={createCategory}
          onUpdate={updateCategory}
        />
      ),
    });
    if (created) injectCategory(created);
  };

  const openCreateClient = async () => {
    if (lockedClientId) return;
    const created = await pushDrawer<{ id: string; client_name: string }>({
      title: "Nouveau client",
      content: (nested) => (
        <ClientFormDrawer
          mode="create"
          collaborators={collaborators}
          availableCategories={availableCategories}
          helpers={nested}
        />
      ),
    });
    if (created) {
      setClients((prev) => {
        if (prev.some((c) => c.id === created.id)) return prev;
        return [...prev, created].sort((a, b) =>
          a.client_name.localeCompare(b.client_name, "fr"),
        );
      });
      setClientId(created.id);
      setOpportunityId("");
    }
  };

  const buildIdentificationFormData = (): FormData => {
    const formData = new FormData();
    formData.set("mission_name", missionName);
    formData.set("mission_scope", missionScope);
    formData.set("collaborator_id", responsibleId);
    if (missionScope === "client" && clientId) {
      formData.set("client_id", clientId);
    }
    const oppId = lockedOpportunityId ?? opportunityId;
    if (oppId) formData.set("opportunity_id", oppId);
    return formData;
  };

  const buildFullFormData = (): FormData => {
    const formData = buildIdentificationFormData();
    formData.set("estimated_charge", estimatedCharge);
    formData.set("kanban_status", kanbanStatus);
    if (startAt) formData.set("start_at", startAt);
    if (endAt) formData.set("end_at", endAt);
    formData.set("notes", notes);
    if (missionScope === "client") {
      const oppId = lockedOpportunityId ?? opportunityId;
      if (oppId) {
        formData.set("opportunity_id", oppId);
      }
    }
    for (const category of selectedCategories) {
      formData.append("category_ids", category.id);
    }
    return formData;
  };

  const handleSaveIdentification = (event: FormEvent) => {
    event.preventDefault();
    setFieldErrors({});

    startTransition(async () => {
      if (mode === "create" && !identificationSaved) {
        const result = await createMissionRecord(buildIdentificationFormData());
        if (!result.success) {
          setFieldErrors(result.fieldErrors ?? {});
          toast.error(result.error);
          return;
        }
        setMissionId(result.id);
        setIdentificationSaved(true);
        toast.success("Mission créée. Complétez les informations.");
        return;
      }

      toast.message("Utilisez Enregistrer en bas du formulaire.");
    });
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (mode === "create" && !identificationSaved) {
      void handleSaveIdentification(event);
      return;
    }

    setFieldErrors({});
    startTransition(async () => {
      const result = await updateMissionRecord(
        missionId,
        buildFullFormData(),
      );
      if (!result.success) {
        setFieldErrors(result.fieldErrors ?? {});
        toast.error(result.error);
        return;
      }

      toast.success(
        mode === "create" ? "Mission enregistrée." : "Mission mise à jour.",
      );
      helpers.resolve({
        id: result.id,
        mission_name: missionName.trim(),
      });
    });
  };

  const showComplement = mode === "edit" || identificationSaved;
  const showScopeToggle = !lockedScope;
  const showClientField = missionScope === "client" && !lockedClientId;
  const showLockedClient = missionScope === "client" && Boolean(lockedClientId);
  const showOpportunityField =
    missionScope === "client" && !lockedOpportunityId;

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-6">
        <section className="space-y-4">
          <h3 className="text-sm font-semibold">Identification</h3>

          <div className="grid gap-2">
            <Label htmlFor="mission_name">
              Titre <span className="text-destructive">*</span>
            </Label>
            <Input
              id="mission_name"
              value={missionName}
              onChange={(event) => setMissionName(event.target.value)}
              disabled={isPending}
              required
              autoFocus
              aria-invalid={Boolean(fieldErrors.mission_name)}
            />
            {fieldErrors.mission_name ? (
              <p className="text-sm text-destructive">
                {fieldErrors.mission_name}
              </p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label>
              Responsable mission{" "}
              <span className="text-destructive">*</span>
            </Label>
            <Select
              value={responsibleId || "__unset__"}
              onValueChange={(value) =>
                setResponsibleId(value === "__unset__" ? "" : value)
              }
              disabled={isPending || activeCollaborators.length === 0}
            >
              <SelectTrigger
                className="w-full"
                aria-invalid={Boolean(fieldErrors.collaborator_id)}
              >
                <SelectValue placeholder="Sélectionner un collaborateur" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__unset__" disabled>
                  Sélectionner un collaborateur
                </SelectItem>
                {activeCollaborators.map((person) => (
                  <SelectItem key={person.id} value={person.id}>
                    {getCollaboratorFullName(person)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.collaborator_id ? (
              <p className="text-sm text-destructive">
                {fieldErrors.collaborator_id}
              </p>
            ) : null}
          </div>

          {showScopeToggle ? (
            <div className="flex items-center gap-2">
              <input
                id="mission_interne"
                type="checkbox"
                className="size-4 rounded border"
                checked={isInterne}
                disabled={isPending}
                onChange={(event) => {
                  setIsInterne(event.target.checked);
                  if (event.target.checked) {
                    setClientId("");
                    setOpportunityId("");
                  }
                }}
              />
              <Label htmlFor="mission_interne" className="font-normal">
                Mission interne
              </Label>
            </div>
          ) : lockedScope === "interne" ? (
            <p className="text-sm text-muted-foreground">Mission interne</p>
          ) : null}

          {showClientField ? (
            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-2">
                <Label>
                  Client <span className="text-destructive">*</span>
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Nouveau client"
                  title="Nouveau client"
                  disabled={isPending}
                  onClick={() => void openCreateClient()}
                >
                  <Buildings className="size-4" />
                </Button>
              </div>
              <Select
                value={clientId || "__unset__"}
                onValueChange={(value) => {
                  const next = value === "__unset__" ? "" : value;
                  setClientId(next);
                  setOpportunityId("");
                }}
                disabled={isPending || clients.length === 0}
              >
                <SelectTrigger
                  className="w-full"
                  aria-invalid={Boolean(fieldErrors.client_id)}
                >
                  <SelectValue placeholder="Sélectionner un client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__unset__" disabled>
                    Sélectionner un client
                  </SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.client_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.client_id ? (
                <p className="text-sm text-destructive">
                  {fieldErrors.client_id}
                </p>
              ) : null}
            </div>
          ) : null}

          {showLockedClient ? (
            <div className="grid gap-1 text-sm">
              <p className="text-muted-foreground">Client</p>
              <p className="font-medium">
                {clients.find((c) => c.id === lockedClientId)?.client_name ??
                  "—"}
              </p>
            </div>
          ) : null}

          {mode === "create" && !identificationSaved ? (
            <div className="flex justify-end">
              <Button
                type="button"
                disabled={isPending}
                onClick={(event) =>
                  handleSaveIdentification(event as unknown as FormEvent)
                }
              >
                {isPending ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </div>
          ) : null}
        </section>

        {showComplement ? (
          <section className="space-y-4 border-t pt-4">
            <h3 className="text-sm font-semibold">Complément</h3>

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
              <CategoryMultiCombobox
                items={categories}
                value={selectedCategories}
                onValueChange={setSelectedCategories}
                disabled={isPending}
                emptyListMessage="Aucune catégorie. Créez-en une avec le bouton ci-dessus."
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="estimated_charge">Temps vendu (jours)</Label>
                <Input
                  id="estimated_charge"
                  inputMode="decimal"
                  value={estimatedCharge}
                  onChange={(event) => setEstimatedCharge(event.target.value)}
                  disabled={isPending}
                  placeholder="0"
                  aria-invalid={Boolean(fieldErrors.estimated_charge)}
                />
                {fieldErrors.estimated_charge ? (
                  <p className="text-sm text-destructive">
                    {fieldErrors.estimated_charge}
                  </p>
                ) : null}
              </div>
              <div className="grid gap-2">
                <Label>Statut</Label>
                <Select
                  value={kanbanStatus}
                  onValueChange={(value) =>
                    setKanbanStatus(value as MissionKanbanStatus)
                  }
                  disabled={isPending}
                >
                  <SelectTrigger
                    className="w-full"
                    aria-invalid={Boolean(fieldErrors.kanban_status)}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MISSION_KANBAN_STATUSES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {getMissionKanbanStatusLabel(value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="start_at">Date de début</Label>
                <Input
                  id="start_at"
                  type="date"
                  value={startAt}
                  onChange={(event) => setStartAt(event.target.value)}
                  disabled={isPending}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="end_at">Date de fin</Label>
                <Input
                  id="end_at"
                  type="date"
                  value={endAt}
                  onChange={(event) => setEndAt(event.target.value)}
                  disabled={isPending}
                />
              </div>
            </div>

            {showOpportunityField ? (
              <div className="grid gap-2">
                <Label>Opportunité</Label>
                <Select
                  value={opportunityId || "none"}
                  onValueChange={(value) =>
                    setOpportunityId(value === "none" ? "" : value)
                  }
                  disabled={
                    isPending || !(lockedClientId ?? clientId)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Aucune opportunité" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucune opportunité</SelectItem>
                    {filteredOpportunities.map((opp) => (
                      <SelectItem key={opp.id} value={opp.id}>
                        {opp.opportunity_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {lockedOpportunityId ? (
              <div className="grid gap-1 text-sm">
                <p className="text-muted-foreground">Opportunité</p>
                <p className="font-medium">
                  {opportunityOptions.find((o) => o.id === lockedOpportunityId)
                    ?.opportunity_name ?? "—"}
                </p>
              </div>
            ) : null}

            <div className="grid gap-2">
              <Label htmlFor="mission_notes">Notes</Label>
              <Textarea
                id="mission_notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                disabled={isPending}
                rows={4}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Documents, outils et wiki : disponibles aux points Gestion
              documentaire, Toolbox et Wiki &amp; Documents.
            </p>
          </section>
        ) : null}
      </div>

      {showComplement ? (
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
            {isPending
              ? "Enregistrement…"
              : mode === "create"
                ? "Créer"
                : "Enregistrer"}
          </Button>
        </div>
      ) : (
        <div className="mt-6 flex shrink-0 justify-end gap-2 border-t pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => helpers.dismiss()}
            disabled={isPending}
          >
            Annuler
          </Button>
        </div>
      )}
    </form>
  );
}
