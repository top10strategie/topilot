"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { flushSync } from "react-dom";
import { FolderSimplePlus, UserPlus } from "@phosphor-icons/react";
import { toast } from "sonner";
import { createBusinessCategory, updateBusinessCategory } from "@/actions/categories";

import {
  createOpportunityRecord,
  fetchOpportunityContactOptions,
  updateOpportunityRecord,
} from "@/actions/opportunities";
import { CategoryMultiCombobox } from "@/components/categories/category-multi-combobox";
import { LabelEntityFormDrawer } from "@/components/categories/label-entity-form-drawer";
import {
  ClientFormDrawer,
  type ClientFormResult,
} from "@/components/clients/client-form-drawer";
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
import { Textarea } from "@/components/ui/textarea";
import { useTwoStepCreateForm } from "@/hooks/use-two-step-create-form";
import type { CategoryItem } from "@/lib/categories/types";
import { getCollaboratorFullName } from "@/lib/collaborators/labels";
import type { CollaboratorListItem } from "@/lib/collaborators/types";
import { getContactFullName } from "@/lib/clients/labels";
import type { ClientOption } from "@/lib/clients/types";
import {
  formatOpportunityPrice,
  getOpportunityInvoiceFrequencyLabel,
  getOpportunityKanbanStatusLabel,
  getOpportunityPriorityLabel,
  OPPORTUNITY_INVOICE_FREQUENCIES,
  OPPORTUNITY_KANBAN_STATUSES,
  OPPORTUNITY_PRIORITIES,
} from "@/lib/opportunities/labels";
import type {
  OpportunityCategoryItem,
  OpportunityContactOption,
  OpportunityDetail,
  OpportunityInvoiceFrequency,
  OpportunityKanbanStatus,
  OpportunityPriority,
} from "@/lib/opportunities/types";

type OpportunityFormDrawerProps = {
  mode: "create" | "edit";
  opportunity?: OpportunityDetail;
  collaborators: CollaboratorListItem[];
  clients: ClientOption[];
  /** Si omis, chargé à l’ouverture du tiroir. */
  contacts?: OpportunityContactOption[];
  availableCategories: CategoryItem[];
  canManagePrivacy?: boolean;
  helpers: DrawerHelpers<{ id: string; opportunity_name: string }>;
};

type LocalClient = ClientOption;
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
  canManagePrivacy = false,
  helpers,
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

  const [opportunityName, setOpportunityName] = useState(
    opportunity?.opportunity_name ?? "",
  );
  const [clientId, setClientId] = useState(opportunity?.client_id ?? "");
  const [contactClientId, setContactClientId] = useState(
    opportunity?.contact_client_id ?? "",
  );
  const [responsibleId, setResponsibleId] = useState(
    opportunity?.collaborator_id ?? "",
  );
  const [lastMeetingAt, setLastMeetingAt] = useState(
    opportunity?.last_meeting_at ?? "",
  );
  const [dueDateAt, setDueDateAt] = useState(opportunity?.due_date_at ?? "");
  const [closedAt, setClosedAt] = useState(opportunity?.closed_at ?? "");
  const [endAt, setEndAt] = useState(opportunity?.end_at ?? "");
  const [invoiceFrequency, setInvoiceFrequency] = useState<
    OpportunityInvoiceFrequency | ""
  >(opportunity?.invoice_frequency ?? "");

  const [price, setPrice] = useState(
    opportunity?.price != null ? String(opportunity.price) : "",
  );
  const [probability, setProbability] = useState(
    opportunity?.probability_confirmation != null
      ? String(opportunity.probability_confirmation)
      : "10",
  );
  const [priority, setPriority] = useState<OpportunityPriority>(
    opportunity?.priority ?? "normal",
  );
  const [kanbanStatus, setKanbanStatus] = useState<OpportunityKanbanStatus>(
    opportunity?.kanban_status ?? "suspect",
  );
  const [action, setAction] = useState(opportunity?.action ?? "");
  const [source, setSource] = useState(opportunity?.source ?? "");
  const [notes, setNotes] = useState(opportunity?.notes ?? "");

  const [clients, setClients] = useState<LocalClient[]>(() =>
    [...initialClients]
      .map((c) => ({ id: c.id, client_name: c.client_name }))
      .sort((a, b) => a.client_name.localeCompare(b.client_name, "fr")),
  );
  const [contacts, setContacts] = useState<LocalContact[]>(() => {
    const list = [...(initialContacts ?? [])];
    const linked = opportunity?.contact;
    if (
      linked &&
      opportunity &&
      !list.some((contact) => contact.id === linked.id)
    ) {
      list.push({
        id: linked.id,
        client_id: opportunity.client_id,
        first_name: linked.first_name,
        last_name: linked.last_name,
        is_main: false,
      });
    }
    return list;
  });
  const [clientSelectEpoch, setClientSelectEpoch] = useState(0);
  const [contactSelectEpoch, setContactSelectEpoch] = useState(0);

  useEffect(() => {
    if ((initialContacts?.length ?? 0) > 0) return;
    let cancelled = false;
    void fetchOpportunityContactOptions().then((result) => {
      if (cancelled) return;
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setContacts((prev) => {
        const incomingIds = new Set(result.contacts.map((c) => c.id));
        const extra = prev.filter((c) => !incomingIds.has(c.id));
        return [...result.contacts, ...extra];
      });
    });
    return () => {
      cancelled = true;
    };
  }, [initialContacts]);

  const [categories, setCategories] = useState<OpportunityCategoryItem[]>(
    () => {
      const byId = new Map<string, OpportunityCategoryItem>();
      for (const item of availableCategories) byId.set(item.id, item);
      for (const item of opportunity?.categories ?? []) byId.set(item.id, item);
      return [...byId.values()].sort((a, b) =>
        a.label.localeCompare(b.label, "fr"),
      );
    },
  );
  const [selectedCategories, setSelectedCategories] = useState<
    OpportunityCategoryItem[]
  >(() => [...(opportunity?.categories ?? [])]);

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

  const applyClient = (created: ClientFormResult) => {
    const preferredContactId =
      created.contacts.find((c) => c.is_main)?.id ??
      (created.contacts.length === 1 ? created.contacts[0].id : "");

    flushSync(() => {
      setClients((prev) => {
        if (prev.some((c) => c.id === created.id)) return prev;
        return [
          ...prev,
          { id: created.id, client_name: created.client_name },
        ].sort((a, b) => a.client_name.localeCompare(b.client_name, "fr"));
      });
      setContacts((prev) => {
        const incomingIds = new Set(created.contacts.map((c) => c.id));
        const withoutIncoming = prev.filter((c) => !incomingIds.has(c.id));
        const merged = [
          ...withoutIncoming,
          ...created.contacts.map((c) => ({
            id: c.id,
            client_id: created.id,
            first_name: c.first_name,
            last_name: c.last_name,
            is_main: c.is_main,
          })),
        ];
        if (!created.contacts.some((c) => c.is_main)) return merged;
        return merged.map((c) =>
          c.client_id === created.id && !incomingIds.has(c.id)
            ? { ...c, is_main: false }
            : c,
        );
      });
      setClientId(created.id);
      setContactClientId(preferredContactId);
      setClientSelectEpoch((n) => n + 1);
      setContactSelectEpoch((n) => n + 1);
    });
  };

  const injectClient = (created: ClientFormResult) => {
    applyClient(created);
    toast.success("Client créé et sélectionné.");
  };

  const applyContact = (created: ContactFormResult, forClientId: string) => {
    flushSync(() => {
      setContacts((prev) => {
        const next = prev.map((c) =>
          c.client_id === forClientId && created.is_main
            ? { ...c, is_main: false }
            : c,
        );
        if (next.some((c) => c.id === created.id)) return next;
        return [
          ...next,
          {
            id: created.id,
            client_id: forClientId,
            first_name: created.first_name,
            last_name: created.last_name,
            is_main: created.is_main,
          },
        ];
      });
      setContactClientId(created.id);
      setContactSelectEpoch((n) => n + 1);
    });
  };

  const injectContact = (created: ContactFormResult, forClientId: string) => {
    applyContact(created, forClientId);
    toast.success("Contact créé et sélectionné.");
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
    const created = await pushDrawer<ClientFormResult>({
      title: "Nouveau client",
      content: (nested) => (
        <ClientFormDrawer
          mode="create"
          collaborators={collaborators}
          availableCategories={availableCategories}
          canManagePrivacy={canManagePrivacy}
          helpers={{
            dismiss: nested.dismiss,
            resolve: (value) => {
              injectClient(value);
              nested.resolve(value);
            },
          }}
        />
      ),
    });
    if (created) applyClient(created);
  };

  const openCreateContact = async () => {
    if (!clientId) {
      toast.error("Sélectionnez d'abord un client.");
      return;
    }
    const forClientId = clientId;
    const created = await pushDrawer<ContactFormResult>({
      title: "Nouveau contact",
      content: (nested) => (
        <ContactFormDrawer
          mode="create"
          clientId={forClientId}
          contactCount={clientContacts.length}
          helpers={{
            dismiss: nested.dismiss,
            resolve: (value) => {
              injectContact(value, forClientId);
              nested.resolve(value);
            },
          }}
        />
      ),
    });
    if (created) applyContact(created, forClientId);
  };

  const handleClientChange = (nextClientId: string) => {
    setClientId(nextClientId);
    setContactClientId("");
  };

  const buildIdentificationFormData = (): FormData => {
    const formData = new FormData();
    formData.set("opportunity_name", opportunityName);
    formData.set("client_id", clientId);
    if (contactClientId) formData.set("contact_client_id", contactClientId);
    formData.set("collaborator_id", responsibleId);
    if (lastMeetingAt) formData.set("last_meeting_at", lastMeetingAt);
    if (dueDateAt) formData.set("due_date_at", dueDateAt);
    if (mode === "edit") {
      formData.set("closed_at", closedAt);
    }
    if (endAt) formData.set("end_at", endAt);
    if (invoiceFrequency) formData.set("invoice_frequency", invoiceFrequency);
    return formData;
  };

  const buildFullFormData = (): FormData => {
    const formData = buildIdentificationFormData();
    formData.set("price", price);
    formData.set("probability_confirmation", probability);
    formData.set("priority", priority);
    formData.set("kanban_status", kanbanStatus);
    formData.set("action", action);
    formData.set("source", source);
    if (mode === "create") {
      formData.set("notes", notes);
    }
    for (const category of selectedCategories) {
      formData.append("category_ids", category.id);
    }
    return formData;
  };

  const {
    isPending,
    entityId: opportunityId,
    identificationSaved,
    showComplement,
    fieldErrors,
    handleSaveIdentification,
    handleSubmit,
  } = useTwoStepCreateForm({
    mode,
    initialEntityId: opportunity?.id ?? "",
    buildIdentificationFormData,
    buildFullFormData,
    createRecord: async (formData) => {
      const result = await createOpportunityRecord(formData);
      if (result.success) {
        if (result.kanban_status) {
          setKanbanStatus(result.kanban_status);
        }
        if (
          result.probability_confirmation != null &&
          Number.isFinite(result.probability_confirmation)
        ) {
          setProbability(String(result.probability_confirmation));
        }
      }
      return result;
    },
    updateRecord: updateOpportunityRecord,
    messages: {
      identificationSaved: "Opportunité créée. Complétez les informations.",
      created: "Opportunité enregistrée.",
      updated: "Opportunité mise à jour.",
    },
    onResolved: (id) => {
      helpers.resolve({
        id,
        opportunity_name: opportunityName.trim(),
      });
    },
  });

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
                <UserPlus className="size-4" />
              </Button>
            </div>
            <Select
              key={clientSelectEpoch}
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
              key={contactSelectEpoch}
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

          <div
            className={
              mode === "edit"
                ? "grid grid-cols-1 gap-4 md:grid-cols-3"
                : "grid grid-cols-1 gap-4 md:grid-cols-2"
            }
          >
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
              <Label htmlFor="due_date_at">
                Échéance <span className="text-destructive">*</span>
              </Label>
              <Input
                id="due_date_at"
                type="date"
                value={dueDateAt}
                onChange={(event) => setDueDateAt(event.target.value)}
                disabled={isPending}
                required
                aria-invalid={Boolean(fieldErrors.due_date_at)}
              />
              {fieldErrors.due_date_at ? (
                <p className="text-sm text-destructive">
                  {fieldErrors.due_date_at}
                </p>
              ) : null}
            </div>
            {mode === "edit" ? (
              <div className="grid gap-2">
                <Label htmlFor="closed_at">Début de la facturation</Label>
                <Input
                  id="closed_at"
                  type="date"
                  value={closedAt}
                  onChange={(event) => setClosedAt(event.target.value)}
                  disabled={isPending}
                  aria-invalid={Boolean(fieldErrors.closed_at)}
                />
                {fieldErrors.closed_at ? (
                  <p className="text-sm text-destructive">
                    {fieldErrors.closed_at}
                  </p>
                ) : null}
              </div>
            ) : null}
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

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="end_at">Fin de facturation</Label>
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
              <div className="grid gap-2">
                <Label htmlFor="invoice_frequency">
                  Fréquence de facturation
                </Label>
                <Select
                  value={invoiceFrequency || "__none__"}
                  onValueChange={(value) =>
                    setInvoiceFrequency(
                      value === "__none__"
                        ? ""
                        : (value as OpportunityInvoiceFrequency),
                    )
                  }
                  disabled={isPending}
                >
                  <SelectTrigger
                    id="invoice_frequency"
                    className="w-full"
                    aria-invalid={Boolean(fieldErrors.invoice_frequency)}
                  >
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {OPPORTUNITY_INVOICE_FREQUENCIES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {getOpportunityInvoiceFrequencyLabel(value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.invoice_frequency ? (
                  <p className="text-sm text-destructive">
                    {fieldErrors.invoice_frequency}
                  </p>
                ) : null}
              </div>
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

            {mode === "create" ? (
              <div className="grid gap-2">
                <Label htmlFor="opportunity_notes">Notes</Label>
                <Textarea
                  id="opportunity_notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  disabled={isPending}
                  rows={4}
                />
              </div>
            ) : null}

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
