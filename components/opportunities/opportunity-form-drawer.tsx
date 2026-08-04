"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { Buildings, FolderSimplePlus, UserPlus } from "@phosphor-icons/react";
import { toast } from "sonner";
import { createCategory, updateCategory } from "@/actions/categories";
import {
  createOpportunityRecord,
  updateOpportunityRecord,
} from "@/actions/opportunities";
import { CategoryMultiCombobox } from "@/components/categories/category-multi-combobox";
import { LabelEntityFormDrawer } from "@/components/categories/label-entity-form-drawer";
import { ClientFormDrawer } from "@/components/clients/client-form-drawer";
import {
  ContactFormDrawer,
  type ContactFormResult,
} from "@/components/clients/contact-form-drawer";
import { DrawerBody, DrawerFooterActions } from "@/components/drawers/drawer-section";
import type { DrawerHelpers } from "@/components/drawers/drawer-stack-context";
import { useDrawerStack } from "@/components/drawers/drawer-stack-context";
import { EntityFormDocumentationBlock } from "@/components/layout/entity-form-documentation-block";
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
import type { CategoryItem } from "@/lib/categories/types";
import { getCollaboratorFullName } from "@/lib/collaborators/labels";
import type { CollaboratorListItem } from "@/lib/collaborators/types";
import { getContactFullName } from "@/lib/clients/labels";
import type { ClientListItem } from "@/lib/clients/types";
import {
  formatOpportunityPrice,
  getOpportunityKanbanStatusLabel,
  getOpportunityPriorityLabel,
  OPPORTUNITY_KANBAN_STATUSES,
  OPPORTUNITY_PRIORITIES,
} from "@/lib/opportunities/labels";
import type { OpportunityDuplicatePrefill } from "@/lib/crm/duplicate-prefill";
import type {
  OpportunityCategoryItem,
  OpportunityContactOption,
  OpportunityDetail,
  OpportunityKanbanStatus,
  OpportunityPriority,
} from "@/lib/opportunities/types";

type OpportunityFormDrawerProps = {
  mode: "create" | "edit";
  opportunity?: OpportunityDetail;
  collaborators: CollaboratorListItem[];
  clients: ClientListItem[];
  contacts: OpportunityContactOption[];
  availableCategories: CategoryItem[];
  helpers: DrawerHelpers<{ id: string; opportunity_name: string }>;
  /** Prefill création (duplication). */
  duplicatePrefill?: OpportunityDuplicatePrefill;
};

type LocalClient = Pick<ClientListItem, "id" | "client_name">;
type LocalContact = OpportunityContactOption;

/**
 * Tiroir Nouvelle opportunité (création 2 temps) / Édition (save unique).
 */
export function OpportunityFormDrawer({
  mode,
  opportunity,
  collaborators,
  clients: initialClients,
  contacts: initialContacts,
  availableCategories = [],
  helpers,
  duplicatePrefill,
}: OpportunityFormDrawerProps) {
  const { pushDrawer } = useDrawerStack();
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

  const [opportunityId, setOpportunityId] = useState(opportunity?.id ?? "");
  const [identificationSaved, setIdentificationSaved] = useState(
    mode === "edit",
  );

  const [opportunityName, setOpportunityName] = useState(
    duplicatePrefill?.opportunity_name ?? opportunity?.opportunity_name ?? "",
  );
  const [clientId, setClientId] = useState(
    duplicatePrefill?.client_id ?? opportunity?.client_id ?? "",
  );
  const [contactClientId, setContactClientId] = useState(
    duplicatePrefill?.contact_client_id ??
      opportunity?.contact_client_id ??
      "",
  );
  const [responsibleId, setResponsibleId] = useState(
    duplicatePrefill?.collaborator_id ?? opportunity?.collaborator_id ?? "",
  );
  const [lastMeetingAt, setLastMeetingAt] = useState(
    duplicatePrefill?.last_meeting_at ?? opportunity?.last_meeting_at ?? "",
  );
  const [dueDateAt, setDueDateAt] = useState(
    duplicatePrefill ? "" : (opportunity?.due_date_at ?? ""),
  );
  const [endAt, setEndAt] = useState(
    duplicatePrefill ? "" : (opportunity?.end_at ?? ""),
  );

  const [price, setPrice] = useState(
    duplicatePrefill
      ? ""
      : opportunity?.price != null
        ? String(opportunity.price)
        : "",
  );
  const [probability, setProbability] = useState(
    duplicatePrefill
      ? "10"
      : opportunity?.probability_confirmation != null
        ? String(opportunity.probability_confirmation)
        : "10",
  );
  const [priority, setPriority] = useState<OpportunityPriority>(
    opportunity?.priority ?? "normal",
  );
  const [kanbanStatus, setKanbanStatus] = useState<OpportunityKanbanStatus>(
    opportunity?.kanban_status ?? "suspect",
  );
  const [action, setAction] = useState(
    duplicatePrefill?.action ?? opportunity?.action ?? "",
  );
  const [source, setSource] = useState(
    duplicatePrefill?.source ?? opportunity?.source ?? "",
  );
  const [notes] = useState(
    duplicatePrefill?.notes ?? opportunity?.notes ?? "",
  );

  const [clients, setClients] = useState<LocalClient[]>(() =>
    [...initialClients]
      .map((c) => ({ id: c.id, client_name: c.client_name }))
      .sort((a, b) => a.client_name.localeCompare(b.client_name, "fr")),
  );
  const [contacts, setContacts] = useState<LocalContact[]>(() => [
    ...initialContacts,
  ]);

  const [categories, setCategories] = useState<OpportunityCategoryItem[]>(
    () => {
      const byId = new Map<string, OpportunityCategoryItem>();
      for (const item of availableCategories) byId.set(item.id, item);
      for (const item of opportunity?.categories ?? []) byId.set(item.id, item);
      for (const item of duplicatePrefill?.categories ?? [])
        byId.set(item.id, item);
      return [...byId.values()].sort((a, b) =>
        a.label.localeCompare(b.label, "fr"),
      );
    },
  );
  const [selectedCategories, setSelectedCategories] = useState<
    OpportunityCategoryItem[]
  >(() => [
    ...(duplicatePrefill?.categories ?? opportunity?.categories ?? []),
  ]);

  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<string, string>>
  >({});
  const [isPending, startTransition] = useTransition();

  const clientContacts = useMemo(
    () =>
      contacts
        .filter((c) => c.client_id === clientId)
        .sort((a, b) => {
          if (a.is_main !== b.is_main) return a.is_main ? -1 : 1;
          return `${a.last_name} ${a.first_name}`.localeCompare(
            `${b.last_name} ${b.first_name}`,
            "fr",
          );
        }),
    [clientId, contacts],
  );

  const weightedPrice = useMemo(() => {
    const p = Number(price.replace(",", "."));
    const prob = Number(probability.replace(",", "."));
    if (!Number.isFinite(p) || !Number.isFinite(prob)) return null;
    return (p * prob) / 100;
  }, [price, probability]);

  const injectCategory = (item: OpportunityCategoryItem) => {
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
      setContactClientId("");
    }
  };

  const openCreateContact = async () => {
    if (!clientId) {
      toast.error("Sélectionnez d'abord un client.");
      return;
    }
    const created = await pushDrawer<ContactFormResult>({
      title: "Nouveau contact",
      content: (nested) => (
        <ContactFormDrawer
          mode="create"
          clientId={clientId}
          contactCount={clientContacts.length}
          helpers={nested}
        />
      ),
    });
    if (created) {
      setContacts((prev) => {
        const next = prev.map((c) =>
          c.client_id === clientId && created.is_main
            ? { ...c, is_main: false }
            : c,
        );
        if (next.some((c) => c.id === created.id)) return next;
        return [
          ...next,
          {
            id: created.id,
            client_id: clientId,
            first_name: created.first_name,
            last_name: created.last_name,
            is_main: created.is_main,
          },
        ];
      });
      setContactClientId(created.id);
    }
  };

  const handleClientChange = (nextClientId: string) => {
    setClientId(nextClientId);
    setContactClientId("");
  };

  const handleSaveIdentification = (event: FormEvent) => {
    event.preventDefault();
    setFieldErrors({});

    startTransition(async () => {
      const formData = new FormData();
      formData.set("opportunity_name", opportunityName);
      formData.set("client_id", clientId);
      if (contactClientId) formData.set("contact_client_id", contactClientId);
      formData.set("collaborator_id", responsibleId);
      if (lastMeetingAt) formData.set("last_meeting_at", lastMeetingAt);
      if (dueDateAt) formData.set("due_date_at", dueDateAt);
      if (endAt) formData.set("end_at", endAt);

      if (mode === "create" && !identificationSaved) {
        const result = await createOpportunityRecord(formData);
        if (!result.success) {
          setFieldErrors(result.fieldErrors ?? {});
          toast.error(result.error);
          return;
        }
        setOpportunityId(result.id);
        setIdentificationSaved(true);
        toast.success("Opportunité créée. Complétez les informations.");
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
      const formData = new FormData();
      formData.set("opportunity_name", opportunityName);
      formData.set("client_id", clientId);
      if (contactClientId) formData.set("contact_client_id", contactClientId);
      formData.set("collaborator_id", responsibleId);
      if (lastMeetingAt) formData.set("last_meeting_at", lastMeetingAt);
      if (dueDateAt) formData.set("due_date_at", dueDateAt);
      if (endAt) formData.set("end_at", endAt);
      formData.set("price", price);
      formData.set("probability_confirmation", probability);
      formData.set("priority", priority);
      formData.set("kanban_status", kanbanStatus);
      formData.set("action", action);
      formData.set("source", source);
      formData.set("notes", notes);
      for (const category of selectedCategories) {
        formData.append("category_ids", category.id);
      }

      const result = await updateOpportunityRecord(opportunityId, formData);
      if (!result.success) {
        setFieldErrors(result.fieldErrors ?? {});
        toast.error(result.error);
        return;
      }

      toast.success(
        mode === "create"
          ? "Opportunité enregistrée."
          : "Opportunité mise à jour.",
      );
      helpers.resolve({
        id: result.id,
        opportunity_name: opportunityName.trim(),
      });
    });
  };

  const isDuplicateCreate = mode === "create" && Boolean(duplicatePrefill);
  const showComplement =
    mode === "edit" || identificationSaved || isDuplicateCreate;

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <DrawerBody className="space-y-6">
        <section className="space-y-4">
          <h3 className="text-sm font-semibold">Identification</h3>

          <div className="grid gap-2">
            <Label htmlFor="opportunity_name">
              Titre <span className="text-destructive">*</span>
            </Label>
            <Input
              id="opportunity_name"
              value={opportunityName}
              onChange={(event) => setOpportunityName(event.target.value)}
              disabled={isPending}
              required
              autoFocus
              aria-invalid={Boolean(fieldErrors.opportunity_name)}
            />
            {fieldErrors.opportunity_name ? (
              <p className="text-sm text-destructive">
                {fieldErrors.opportunity_name}
              </p>
            ) : null}
          </div>

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
              onValueChange={(value) =>
                handleClientChange(value === "__unset__" ? "" : value)
              }
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
              <p className="text-sm text-destructive">{fieldErrors.client_id}</p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-2">
              <Label>Contact</Label>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Nouveau contact"
                title="Nouveau contact"
                disabled={isPending || !clientId}
                onClick={() => void openCreateContact()}
              >
                <UserPlus className="size-4" />
              </Button>
            </div>
            <Select
              value={contactClientId || "none"}
              onValueChange={(value) =>
                setContactClientId(value === "none" ? "" : value)
              }
              disabled={isPending || !clientId}
            >
              <SelectTrigger
                className="w-full"
                aria-invalid={Boolean(fieldErrors.contact_client_id)}
              >
                <SelectValue placeholder="Aucun contact" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun contact</SelectItem>
                {clientContacts.map((contact) => (
                  <SelectItem key={contact.id} value={contact.id}>
                    {getContactFullName(contact)}
                    {contact.is_main ? " (principal)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>
              Responsable opportunité{" "}
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

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="last_meeting_at">
                Date de dernière rencontre
              </Label>
              <Input
                id="last_meeting_at"
                type="date"
                value={lastMeetingAt}
                onChange={(event) => setLastMeetingAt(event.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="due_date_at">Échéance</Label>
              <Input
                id="due_date_at"
                type="date"
                value={dueDateAt}
                onChange={(event) => setDueDateAt(event.target.value)}
                disabled={isPending}
                aria-invalid={Boolean(fieldErrors.due_date_at)}
              />
              {fieldErrors.due_date_at ? (
                <p className="text-sm text-destructive">
                  {fieldErrors.due_date_at}
                </p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="end_at">Date de clôture</Label>
              <Input
                id="end_at"
                type="date"
                value={endAt}
                onChange={(event) => setEndAt(event.target.value)}
                disabled={isPending}
                aria-invalid={Boolean(fieldErrors.end_at)}
              />
              {fieldErrors.end_at ? (
                <p className="text-sm text-destructive">{fieldErrors.end_at}</p>
              ) : null}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Au moins une des deux dates (échéance ou clôture) est obligatoire.
          </p>

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
                <Label htmlFor="opportunity_price">Montant</Label>
                <Input
                  id="opportunity_price"
                  inputMode="decimal"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  disabled={isPending}
                  placeholder="0"
                  aria-invalid={Boolean(fieldErrors.price)}
                />
                {fieldErrors.price ? (
                  <p className="text-sm text-destructive">{fieldErrors.price}</p>
                ) : null}
              </div>
              <div className="grid gap-2">
                <Label>Montant pondéré</Label>
                <Input
                  value={formatOpportunityPrice(weightedPrice)}
                  disabled
                  readOnly
                />
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="probability_confirmation">
                  Probabilité de réussite (%)
                </Label>
                <Input
                  id="probability_confirmation"
                  inputMode="decimal"
                  value={probability}
                  onChange={(event) => setProbability(event.target.value)}
                  disabled={isPending}
                  aria-invalid={Boolean(fieldErrors.probability_confirmation)}
                />
                {fieldErrors.probability_confirmation ? (
                  <p className="text-sm text-destructive">
                    {fieldErrors.probability_confirmation}
                  </p>
                ) : null}
              </div>
              <div className="grid gap-2">
                <Label>Urgence</Label>
                <Select
                  value={priority}
                  onValueChange={(value) =>
                    setPriority(value as OpportunityPriority)
                  }
                  disabled={isPending}
                >
                  <SelectTrigger
                    className="w-full"
                    aria-invalid={Boolean(fieldErrors.priority)}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPPORTUNITY_PRIORITIES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {getOpportunityPriorityLabel(value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Statut</Label>
              <Select
                value={kanbanStatus}
                onValueChange={(value) =>
                  setKanbanStatus(value as OpportunityKanbanStatus)
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
                  {OPPORTUNITY_KANBAN_STATUSES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {getOpportunityKanbanStatusLabel(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="opportunity_action">Action</Label>
              <Input
                id="opportunity_action"
                value={action}
                onChange={(event) => setAction(event.target.value)}
                disabled={isPending}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="opportunity_source">Source</Label>
              <Input
                id="opportunity_source"
                value={source}
                onChange={(event) => setSource(event.target.value)}
                disabled={isPending}
              />
            </div>

            {opportunityId ? (
              <div className="space-y-3 border-t pt-4">
                <h4 className="text-sm font-semibold">Documentations</h4>
                <EntityFormDocumentationBlock
                  entity="opportunity"
                  entityId={opportunityId}
                  includeWikis={false}
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
    </form>
  );
}
