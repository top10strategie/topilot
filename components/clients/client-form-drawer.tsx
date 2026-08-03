"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { FolderSimplePlus, UserPlus } from "@phosphor-icons/react";
import { toast } from "sonner";
import { createCategory, updateCategory } from "@/actions/categories";
import {
  createClientRecord,
  updateClientRecord,
} from "@/actions/clients";
import { CategoryMultiCombobox } from "@/components/categories/category-multi-combobox";
import { LabelEntityFormDrawer } from "@/components/categories/label-entity-form-drawer";
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
import { VisualFileField } from "@/components/visuels/visual-file-field";
import type { CategoryItem } from "@/lib/categories/types";
import { getCollaboratorFullName } from "@/lib/collaborators/labels";
import type { CollaboratorListItem } from "@/lib/collaborators/types";
import { getContactFullName } from "@/lib/clients/labels";
import type {
  ClientCategoryItem,
  ClientDetail,
  ContactClientItem,
} from "@/lib/clients/types";

type ClientFormDrawerProps = {
  mode: "create" | "edit";
  client?: ClientDetail;
  collaborators: CollaboratorListItem[];
  availableCategories: CategoryItem[];
  helpers: DrawerHelpers<{ id: string; client_name: string }>;
};

type LocalContact = Pick<
  ContactClientItem,
  "id" | "first_name" | "last_name" | "is_main"
>;

/**
 * Tiroir Nouveau client (création 2 temps) / Édition Client (save unique).
 */
export function ClientFormDrawer({
  mode,
  client,
  collaborators,
  availableCategories = [],
  helpers,
}: ClientFormDrawerProps) {
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

  const [clientId, setClientId] = useState(client?.id ?? "");
  const [identificationSaved, setIdentificationSaved] = useState(
    mode === "edit",
  );

  const [clientName, setClientName] = useState(client?.client_name ?? "");
  const [website, setWebsite] = useState(client?.website ?? "");
  const [responsibleId, setResponsibleId] = useState(
    client?.main_collaborator_id ?? "",
  );
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const [addressStreet, setAddressStreet] = useState(
    client?.address_street ?? "",
  );
  const [addressZip, setAddressZip] = useState(client?.address_zip ?? "");
  const [addressCity, setAddressCity] = useState(client?.address_city ?? "");
  const [driveLink, setDriveLink] = useState(client?.drive_link ?? "");
  const [notes, setNotes] = useState(client?.notes ?? "");
  const [isActive, setIsActive] = useState(client?.is_active ?? true);

  const [categories, setCategories] = useState<ClientCategoryItem[]>(() => {
    const byId = new Map<string, ClientCategoryItem>();
    for (const item of availableCategories) byId.set(item.id, item);
    for (const item of client?.categories ?? []) byId.set(item.id, item);
    return [...byId.values()].sort((a, b) =>
      a.label.localeCompare(b.label, "fr"),
    );
  });
  const [selectedCategories, setSelectedCategories] = useState<
    ClientCategoryItem[]
  >(() => [...(client?.categories ?? [])]);

  const [contacts, setContacts] = useState<LocalContact[]>(() =>
    (client?.contacts ?? []).map((c) => ({
      id: c.id,
      first_name: c.first_name,
      last_name: c.last_name,
      is_main: c.is_main,
    })),
  );

  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<string, string>>
  >({});
  const [isPending, startTransition] = useTransition();

  const injectCategory = (item: ClientCategoryItem) => {
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

  const openCreateContact = async () => {
    if (!clientId) {
      toast.error("Enregistrez d'abord l'identification du client.");
      return;
    }
    const created = await pushDrawer<ContactFormResult>({
      title: "Nouveau contact",
      content: (nested) => (
        <ContactFormDrawer
          mode="create"
          clientId={clientId}
          contactCount={contacts.length}
          helpers={nested}
        />
      ),
    });
    if (created) {
      setContacts((prev) => {
        const next = prev.map((c) =>
          created.is_main ? { ...c, is_main: false } : c,
        );
        if (next.some((c) => c.id === created.id)) return next;
        return [
          ...next,
          {
            id: created.id,
            first_name: created.first_name,
            last_name: created.last_name,
            is_main: created.is_main,
          },
        ];
      });
    }
  };

  const handleSaveIdentification = (event: FormEvent) => {
    event.preventDefault();
    setFieldErrors({});

    startTransition(async () => {
      const formData = new FormData();
      formData.set("client_name", clientName);
      formData.set("website", website);
      formData.set("main_collaborator_id", responsibleId);
      if (logoFile) formData.set("logo", logoFile);

      if (mode === "create" && !identificationSaved) {
        const result = await createClientRecord(formData);
        if (!result.success) {
          setFieldErrors(result.fieldErrors ?? {});
          toast.error(result.error);
          return;
        }
        setClientId(result.id);
        setIdentificationSaved(true);
        toast.success("Client créé. Complétez les informations.");
        return;
      }

      // En édition, l'identification fait partie du save global (footer).
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
      formData.set("client_name", clientName);
      formData.set("website", website);
      formData.set("main_collaborator_id", responsibleId);
      formData.set("address_street", addressStreet);
      formData.set("address_zip", addressZip);
      formData.set("address_city", addressCity);
      formData.set("drive_link", driveLink);
      formData.set("notes", notes);
      formData.set("is_active", isActive ? "true" : "false");
      for (const category of selectedCategories) {
        formData.append("category_ids", category.id);
      }
      if (logoFile) formData.set("logo", logoFile);

      const result = await updateClientRecord(clientId, formData);
      if (!result.success) {
        setFieldErrors(result.fieldErrors ?? {});
        toast.error(result.error);
        return;
      }

      toast.success(
        mode === "create" ? "Client enregistré." : "Client mis à jour.",
      );
      helpers.resolve({ id: result.id, client_name: clientName.trim() });
    });
  };

  const showComplement = mode === "edit" || identificationSaved;

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <DrawerBody className="space-y-6">
        <section className="space-y-4">
          <h3 className="text-sm font-semibold">Identification</h3>

          <VisualFileField
            id="client_logo"
            label="Logo"
            value={logoFile}
            existingUrl={client?.logo_url}
            onChange={setLogoFile}
            disabled={isPending}
            error={fieldErrors.logo}
          />

          <div className="grid gap-2">
            <Label htmlFor="client_name">
              Nom <span className="text-destructive">*</span>
            </Label>
            <Input
              id="client_name"
              value={clientName}
              onChange={(event) => setClientName(event.target.value)}
              disabled={isPending}
              required
              autoFocus
              aria-invalid={Boolean(fieldErrors.client_name)}
            />
            {fieldErrors.client_name ? (
              <p className="text-sm text-destructive">{fieldErrors.client_name}</p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label>
              Responsable client <span className="text-destructive">*</span>
            </Label>
            <Select
              value={responsibleId || undefined}
              onValueChange={setResponsibleId}
              disabled={isPending || activeCollaborators.length === 0}
            >
              <SelectTrigger aria-invalid={Boolean(fieldErrors.main_collaborator_id)}>
                <SelectValue placeholder="Sélectionner un collaborateur" />
              </SelectTrigger>
              <SelectContent>
                {activeCollaborators.map((person) => (
                  <SelectItem key={person.id} value={person.id}>
                    {getCollaboratorFullName(person)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.main_collaborator_id ? (
              <p className="text-sm text-destructive">
                {fieldErrors.main_collaborator_id}
              </p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="client_website">
              Site web <span className="text-destructive">*</span>
            </Label>
            <Input
              id="client_website"
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
              disabled={isPending}
              required
              placeholder="https://"
              aria-invalid={Boolean(fieldErrors.website)}
            />
            {fieldErrors.website ? (
              <p className="text-sm text-destructive">{fieldErrors.website}</p>
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

            {mode === "edit" ? (
              <div className="grid gap-2">
                <Label>Statut</Label>
                <Select
                  value={isActive ? "actif" : "inactif"}
                  onValueChange={(value) => setIsActive(value === "actif")}
                  disabled={isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="actif">Actif</SelectItem>
                    <SelectItem value="inactif">Inactif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="grid gap-2">
              <Label htmlFor="address_street">Adresse</Label>
              <Input
                id="address_street"
                value={addressStreet}
                onChange={(event) => setAddressStreet(event.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="address_zip">Code postal</Label>
                <Input
                  id="address_zip"
                  value={addressZip}
                  onChange={(event) => setAddressZip(event.target.value)}
                  disabled={isPending}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="address_city">Ville</Label>
                <Input
                  id="address_city"
                  value={addressCity}
                  onChange={(event) => setAddressCity(event.target.value)}
                  disabled={isPending}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="drive_link">Lien Drive</Label>
              <Input
                id="drive_link"
                value={driveLink}
                onChange={(event) => setDriveLink(event.target.value)}
                disabled={isPending}
                placeholder="https://"
              />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Contacts</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Nouveau contact"
                  title="Nouveau contact"
                  disabled={isPending}
                  onClick={() => void openCreateContact()}
                >
                  <UserPlus className="size-4" />
                </Button>
              </div>
              {contacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucun contact pour le moment.
                </p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {contacts.map((contact) => (
                    <li key={contact.id} className="flex items-center gap-2">
                      <span>{getContactFullName(contact)}</span>
                      {contact.is_main ? (
                        <span className="text-xs text-muted-foreground">
                          (principal)
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
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
              <CategoryMultiCombobox
                items={categories}
                value={selectedCategories}
                onValueChange={setSelectedCategories}
                disabled={isPending}
                emptyListMessage="Aucune catégorie. Créez-en une avec le bouton ci-dessus."
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="client_notes">Notes</Label>
              <Textarea
                id="client_notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                disabled={isPending}
                rows={4}
              />
            </div>

            {clientId ? (
              <div className="space-y-3 border-t pt-4">
                <h4 className="text-sm font-semibold">Documentations</h4>
                <EntityFormDocumentationBlock
                  entity="client"
                  entityId={clientId}
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
    </form>
  );
}
