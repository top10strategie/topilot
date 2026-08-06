"use client";

import { useMemo, useState, type FormEvent } from "react";
import { FolderSimplePlus, UserPlus } from "@phosphor-icons/react";
import { toast } from "sonner";
import { createBusinessCategory, updateBusinessCategory } from "@/actions/categories";

import {
  createMissionRecord,
  updateMissionRecord,
} from "@/actions/missions";
import {
  stopMissionSeries,
  syncMissionRecurrence,
} from "@/actions/mission-series";
import { CategoryMultiCombobox } from "@/components/categories/category-multi-combobox";
import { LabelEntityFormDrawer } from "@/components/categories/label-entity-form-drawer";
import { ClientFormDrawer } from "@/components/clients/client-form-drawer";
import { DrawerBody, DrawerFooterActions } from "@/components/drawers/drawer-section";
import type { DrawerHelpers } from "@/components/drawers/drawer-stack-context";
import { useDrawerStack } from "@/components/drawers/drawer-stack-context";
import { ConfirmStatusDialog } from "@/components/layout/confirm-status-dialog";
import { EntityFormDocumentationBlock } from "@/components/layout/entity-form-documentation-block";
import {
  createEmptyRecurrenceDraft,
  MissionRecurrenceFields,
  type MissionRecurrenceDraft,
} from "@/components/missions/mission-recurrence-fields";
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
import { useTwoStepCreateForm } from "@/hooks/use-two-step-create-form";
import type { CategoryItem } from "@/lib/categories/types";
import { getCollaboratorFullName } from "@/lib/collaborators/labels";
import type { CollaboratorListItem } from "@/lib/collaborators/types";
import type { ClientListItem } from "@/lib/clients/types";
import { todayParisYmd } from "@/lib/dates/paris";
import {
  getMissionKanbanStatusLabel,
  MISSION_KANBAN_STATUSES,
} from "@/lib/missions/labels";
import type {
  MissionCategoryItem,
  MissionDetail,
  MissionDuplicatePrefill,
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
  canManagePrivacy?: boolean;
  helpers: DrawerHelpers<{ id: string; mission_name: string }>;
  /** Prefill création (duplication). */
  duplicatePrefill?: MissionDuplicatePrefill;
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
  canManagePrivacy = false,
  helpers,
  duplicatePrefill,
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

  const [missionName, setMissionName] = useState(
    duplicatePrefill?.mission_name ?? mission?.mission_name ?? "",
  );
  const [isInterne, setIsInterne] = useState(
    () =>
      (lockedScope ??
        duplicatePrefill?.mission_scope ??
        mission?.mission_scope ??
        "client") === "interne",
  );
  const [clientId, setClientId] = useState(
    lockedClientId ??
      duplicatePrefill?.client_id ??
      mission?.client_id ??
      "",
  );
  const [responsibleId, setResponsibleId] = useState(
    duplicatePrefill?.collaborator_id ??
      mission?.collaborator_id ??
      currentCollaboratorId,
  );
  const [opportunityId, setOpportunityId] = useState(
    lockedOpportunityId ??
      (duplicatePrefill ? "" : (mission?.opportunity_id ?? "")),
  );
  const [estimatedCharge, setEstimatedCharge] = useState(() => {
    const charge =
      duplicatePrefill?.estimated_charge ?? mission?.estimated_charge;
    return charge != null ? String(charge) : "";
  });
  const [kanbanStatus, setKanbanStatus] = useState<MissionKanbanStatus>(
    duplicatePrefill ? "a_faire" : (mission?.kanban_status ?? "a_faire"),
  );
  const [startAt, setStartAt] = useState(
    mode === "create"
      ? todayParisYmd()
      : (mission?.start_at ?? ""),
  );
  const [endAt, setEndAt] = useState(
    mode === "create" ? "" : (mission?.end_at ?? ""),
  );
  const [notes, setNotes] = useState(
    duplicatePrefill?.notes ?? mission?.notes ?? "",
  );
  const [recurrence, setRecurrence] = useState<MissionRecurrenceDraft>(() =>
    createEmptyRecurrenceDraft(mission?.series ?? null),
  );
  const [stopOpen, setStopOpen] = useState(false);

  const [clients, setClients] = useState<LocalClient[]>(() =>
    [...initialClients]
      .map((c) => ({ id: c.id, client_name: c.client_name }))
      .sort((a, b) => a.client_name.localeCompare(b.client_name, "fr")),
  );

  const [categories, setCategories] = useState<MissionCategoryItem[]>(() => {
    const byId = new Map<string, MissionCategoryItem>();
    for (const item of availableCategories) byId.set(item.id, item);
    for (const item of mission?.categories ?? []) byId.set(item.id, item);
    for (const item of duplicatePrefill?.categories ?? []) byId.set(item.id, item);
    return [...byId.values()].sort((a, b) =>
      a.label.localeCompare(b.label, "fr"),
    );
  });
  const [selectedCategories, setSelectedCategories] = useState<
    MissionCategoryItem[]
  >(() => [...(duplicatePrefill?.categories ?? mission?.categories ?? [])]);

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
          entityKind="category_business"
          canManagePrivacy={canManagePrivacy}
          helpers={{
            dismiss: nested.dismiss,
            resolve: (value) => {
              injectCategory(value);
              nested.resolve(value);
            },
          }}
          onCreate={createBusinessCategory}
          onUpdate={updateBusinessCategory}
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
          canManagePrivacy={canManagePrivacy}
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
    if (startAt) formData.set("start_at", startAt);
    formData.set("end_at", endAt);
    return formData;
  };

  const buildFullFormData = (): FormData => {
    const formData = buildIdentificationFormData();
    formData.set("estimated_charge", estimatedCharge);
    formData.set("kanban_status", kanbanStatus);
    if (mode === "create") {
      formData.set("notes", notes);
    }
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

  const {
    isPending,
    entityId: missionId,
    identificationSaved,
    showComplement,
    fieldErrors,
    handleSaveIdentification,
    handleSubmit,
  } = useTwoStepCreateForm({
    mode,
    initialEntityId: mission?.id ?? "",
    buildIdentificationFormData,
    buildFullFormData,
    createRecord: createMissionRecord,
    updateRecord: updateMissionRecord,
    afterUpdate: async (id) => {
      const wantsRecurrence = Boolean(
        recurrence.enabled && recurrence.frequency,
      );
      if (!wantsRecurrence) return true;
      const seriesResult = await syncMissionRecurrence({
        missionId: id,
        enabled: true,
        frequency: recurrence.frequency,
        startsOn: recurrence.startsOn || null,
        endsOn: recurrence.endsOn || null,
      });
      if (!seriesResult.success) {
        toast.error(seriesResult.error);
        return false;
      }
      return true;
    },
    messages: {
      identificationSaved: "Mission créée. Complétez les informations.",
      created: "Mission enregistrée.",
      updated: "Mission mise à jour.",
    },
    onResolved: (id) => {
      helpers.resolve({
        id,
        mission_name: missionName.trim(),
      });
    },
  });

  const seriesStopped =
    Boolean(mission?.series?.ends_on) &&
    (mission?.series?.ends_on ?? "") <= new Date().toISOString().slice(0, 10);
  const showScopeToggle = !lockedScope;
  const showClientField = missionScope === "client" && !lockedClientId;
  const showLockedClient = missionScope === "client" && Boolean(lockedClientId);
  const showOpportunityField =
    missionScope === "client" && !lockedOpportunityId;

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <DrawerBody className="space-y-6">
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
                  <UserPlus className="size-4" />
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

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="start_at">Date de début</Label>
              <Input
                id="start_at"
                type="date"
                value={startAt}
                onChange={(event) => setStartAt(event.target.value)}
                disabled={isPending}
                aria-invalid={Boolean(fieldErrors.start_at)}
              />
              {fieldErrors.start_at ? (
                <p className="text-sm text-destructive">
                  {fieldErrors.start_at}
                </p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="end_at">
                Date de fin <span className="text-destructive">*</span>
              </Label>
              <Input
                id="end_at"
                type="date"
                value={endAt}
                onChange={(event) => setEndAt(event.target.value)}
                disabled={isPending}
                required
                aria-invalid={Boolean(fieldErrors.end_at)}
              />
              {fieldErrors.end_at ? (
                <p className="text-sm text-destructive">{fieldErrors.end_at}</p>
              ) : null}
            </div>
          </div>

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

            {mode === "create" ? (
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
            ) : null}

            <div className="space-y-3 border-t pt-4">
              <MissionRecurrenceFields
                draft={recurrence}
                onChange={setRecurrence}
                hasExistingSeries={Boolean(mission?.series_id)}
                seriesStopped={seriesStopped}
                disabled={isPending}
                onRequestStop={() => setStopOpen(true)}
              />
            </div>

            {missionId ? (
              <div className="space-y-3 border-t pt-4">
                <h4 className="text-sm font-semibold">Documentations</h4>
                <EntityFormDocumentationBlock
                  entity="mission"
                  entityId={missionId}
                  includeWikis
                  categories={categories}
                  collaborators={collaborators}
                />
              </div>
            ) : null}
          </section>
        ) : null}
      </DrawerBody>

      {showComplement ? (
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
            {isPending
              ? "Enregistrement…"
              : mode === "create"
                ? "Créer"
                : "Enregistrer"}
          </Button>
        </DrawerFooterActions>
      ) : (
        <DrawerFooterActions>
          <Button
            type="button"
            variant="outline"
            onClick={() => helpers.dismiss()}
            disabled={isPending}
          >
            Annuler
          </Button>
        </DrawerFooterActions>
      )}

      {mission?.series_id ? (
        <ConfirmStatusDialog
          open={stopOpen}
          onOpenChange={setStopOpen}
          title="Arrêter la récurrence"
          description={
            <p>
              Vous souhaitez arrêter la série de récurrence. La fin de série
              sera fixée à aujourd&apos;hui. Confirmez-vous ?
            </p>
          }
          confirmLabel="Arrêter"
          pendingLabel="Arrêt…"
          successMessage="Récurrence arrêtée."
          onConfirm={() =>
            stopMissionSeries(mission.series_id!, mission.id)
          }
          onSuccess={() => {
            setRecurrence((prev) => ({
              ...prev,
              endsOn: new Date().toISOString().slice(0, 10),
            }));
            helpers.dismiss();
          }}
        />
      ) : null}
    </form>
  );
}
