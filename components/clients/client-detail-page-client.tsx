"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  GearSix,
  MagnifyingGlass,
  PencilSimple,
  PushPin,
  Trash,
  UserPlus,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { deleteContactClient } from "@/actions/contact-clients";
import { ClientFormDrawer } from "@/components/clients/client-form-drawer";
import { ContactFormDrawer } from "@/components/clients/contact-form-drawer";
import { useDrawerStack } from "@/components/drawers/drawer-stack-context";
import { PageHero } from "@/components/layout/page-hero";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CategoryItem } from "@/lib/categories/types";
import {
  getClientResponsibleName,
  getClientStatusLabel,
  getContactFullName,
} from "@/lib/clients/labels";
import type { ClientDetail, ContactClientItem } from "@/lib/clients/types";
import type { CollaboratorListItem } from "@/lib/collaborators/types";

function IconActionButton({
  label,
  variant = "outline",
  disabled,
  onClick,
  children,
}: {
  label: string;
  variant?: "outline" | "destructive" | "default" | "ghost";
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant={variant}
      size="icon"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

type ClientDetailPageClientProps = {
  client: ClientDetail;
  collaborators: CollaboratorListItem[];
  categories: CategoryItem[];
};

export function ClientDetailPageClient({
  client,
  collaborators,
  categories,
}: ClientDetailPageClientProps) {
  const router = useRouter();
  const { pushDrawer } = useDrawerStack();
  const [tab, setTab] = useState("informations");
  const [query, setQuery] = useState("");
  const [manageContacts, setManageContacts] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ContactClientItem | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  const filteredContacts = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("fr");
    if (tab !== "informations" || !q) return client.contacts;
    return client.contacts.filter((contact) =>
      [
        contact.first_name,
        contact.last_name,
        contact.job_title,
        contact.email_address,
        contact.phone_number,
      ]
        .join(" ")
        .toLocaleLowerCase("fr")
        .includes(q),
    );
  }, [client.contacts, query, tab]);

  const openEditClient = () => {
    void pushDrawer({
      title: "Édition Client",
      content: (helpers) => (
        <ClientFormDrawer
          mode="edit"
          client={client}
          collaborators={collaborators}
          availableCategories={categories}
          helpers={helpers}
        />
      ),
    }).then((updated) => {
      if (updated) router.refresh();
    });
  };

  const openCreateContact = () => {
    void pushDrawer({
      title: "Nouveau contact",
      content: (helpers) => (
        <ContactFormDrawer
          mode="create"
          clientId={client.id}
          contactCount={client.contacts.length}
          helpers={helpers}
        />
      ),
    }).then((created) => {
      if (created) router.refresh();
    });
  };

  const openEditContact = (contact: ContactClientItem) => {
    void pushDrawer({
      title: "Édition Contact Client",
      content: (helpers) => (
        <ContactFormDrawer
          mode="edit"
          clientId={client.id}
          contact={contact}
          contactCount={client.contacts.length}
          helpers={helpers}
        />
      ),
    }).then((updated) => {
      if (updated) router.refresh();
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHero
        title={client.client_name}
        actions={
          <div className="flex w-full max-w-md items-center gap-2 md:w-auto md:max-w-none">
            <div className="relative min-w-0 flex-1 md:w-72 md:flex-none">
              <MagnifyingGlass
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                type="search"
                placeholder="Rechercher dans l'onglet…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="pl-8"
                aria-label="Recherche contextuelle fiche client"
              />
            </div>
            <IconActionButton label="Édition Client" onClick={openEditClient}>
              <PencilSimple className="size-4" />
            </IconActionButton>
          </div>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-4 md:px-6">
        <Tabs
          value={tab}
          onValueChange={(value) => {
            setTab(value);
            setQuery("");
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <TabsList variant="line" className="w-full justify-start">
            <TabsTrigger value="informations">Informations</TabsTrigger>
            <TabsTrigger value="missions">Missions</TabsTrigger>
            <TabsTrigger value="documentations">Documentations</TabsTrigger>
          </TabsList>

          <TabsContent
            value="informations"
            className="mt-4 min-h-0 flex-1 space-y-6 overflow-y-auto"
          >
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <div className="flex size-16 items-center justify-center overflow-hidden rounded-md bg-muted text-lg font-semibold">
                    {client.logo_url ? (
                      <img
                        src={client.logo_url}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      client.client_name.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{client.client_name}</p>
                    <Badge variant={client.is_active ? "default" : "secondary"}>
                      {getClientStatusLabel(client.is_active)}
                    </Badge>
                  </div>
                </div>
                <p>
                  <span className="text-muted-foreground">Site : </span>
                  {client.website || "—"}
                </p>
                <p>
                  <span className="text-muted-foreground">Responsable : </span>
                  {getClientResponsibleName(client.responsible)}
                </p>
                <p>
                  <span className="text-muted-foreground">Adresse : </span>
                  {[
                    client.address_street,
                    [client.address_zip, client.address_city]
                      .filter(Boolean)
                      .join(" "),
                  ]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </p>
                <p>
                  <span className="text-muted-foreground">Drive : </span>
                  {client.drive_link || "—"}
                </p>
                <div>
                  <p className="text-muted-foreground">Catégories</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {client.categories.length === 0 ? (
                      <span>—</span>
                    ) : (
                      client.categories.map((category) => (
                        <Badge key={category.id} variant="secondary">
                          {category.label}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <p className="font-medium">Notes</p>
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {client.notes?.trim() || "Aucune note."}
                </p>
              </div>
            </div>

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold">
                  Contact chez le client
                </h2>
                <div className="flex gap-1">
                  <IconActionButton
                    label="Nouveau contact"
                    onClick={openCreateContact}
                  >
                    <UserPlus className="size-4" />
                  </IconActionButton>
                  <IconActionButton
                    label="Gestion contact"
                    onClick={() => setManageContacts((v) => !v)}
                  >
                    <GearSix className="size-4" />
                  </IconActionButton>
                </div>
              </div>

              {filteredContacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun contact</p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {filteredContacts.map((contact) => {
                    const initials = `${contact.first_name[0] ?? ""}${contact.last_name[0] ?? ""}`.toUpperCase();
                    const avatar = (
                      <div className="relative">
                        <Avatar className="size-14">
                          {contact.profile_picture_url ? (
                            <AvatarImage
                              src={contact.profile_picture_url}
                              alt=""
                            />
                          ) : null}
                          <AvatarFallback>{initials || "?"}</AvatarFallback>
                        </Avatar>
                        {contact.is_main ? (
                          <PushPin
                            className="absolute -top-1 -right-1 size-4 fill-primary text-primary"
                            weight="fill"
                            aria-label="Contact principal"
                          />
                        ) : null}
                      </div>
                    );

                    if (manageContacts) {
                      return (
                        <div
                          key={contact.id}
                          className="flex flex-col items-center gap-2"
                        >
                          {avatar}
                          <div className="flex gap-1">
                            <IconActionButton
                              label={`Modifier ${getContactFullName(contact)}`}
                              onClick={() => openEditContact(contact)}
                            >
                              <PencilSimple className="size-4" />
                            </IconActionButton>
                            <IconActionButton
                              label={`Supprimer ${getContactFullName(contact)}`}
                              variant="destructive"
                              onClick={() => setPendingDelete(contact)}
                            >
                              <Trash className="size-4" />
                            </IconActionButton>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <HoverCard key={contact.id}>
                        <HoverCardTrigger asChild>
                          <button type="button" className="rounded-full">
                            {avatar}
                          </button>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-64 space-y-1 text-sm">
                          <p className="font-medium">
                            {getContactFullName(contact)}
                            {contact.is_main ? " · Principal" : ""}
                          </p>
                          <p className="text-muted-foreground">
                            {contact.job_title || "—"}
                          </p>
                          <p>{contact.email_address || "—"}</p>
                          <p>{contact.phone_number || "—"}</p>
                        </HoverCardContent>
                      </HoverCard>
                    );
                  })}
                </div>
              )}
            </section>
          </TabsContent>

          <TabsContent value="missions" className="mt-4 space-y-2">
            <p className="text-sm text-muted-foreground">
              Les missions client seront disponibles au point Pipe production.
            </p>
          </TabsContent>

          <TabsContent value="documentations" className="mt-4 space-y-6">
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Documents</h3>
              {client.documents.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucun document lié.
                </p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {client.documents.map((doc) => (
                    <li key={doc.id}>{doc.document_name}</li>
                  ))}
                </ul>
              )}
            </section>
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Outils</h3>
              <p className="text-sm text-muted-foreground">
                Disponible au point Toolbox.
              </p>
            </section>
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Wikis</h3>
              <p className="text-sm text-muted-foreground">
                Disponible au point Wiki &amp; Documents.
              </p>
            </section>
          </TabsContent>
        </Tabs>
      </div>

      {pendingDelete ? (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) setPendingDelete(null);
          }}
        >
          <DialogContent className="border-destructive">
            <DialogHeader>
              <DialogTitle className="text-destructive">
                Supprimer le contact
              </DialogTitle>
              <DialogDescription>
                Vous souhaitez supprimer{" "}
                <strong>{getContactFullName(pendingDelete)}</strong>.
                Confirmez-vous ? La suppression est définitive.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => setPendingDelete(null)}
              >
                Annuler
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={isPending}
                onClick={() => {
                  startTransition(async () => {
                    const result = await deleteContactClient(pendingDelete.id);
                    if (!result.success) {
                      toast.error(result.error);
                      return;
                    }
                    toast.success("Contact supprimé.");
                    setPendingDelete(null);
                    router.refresh();
                  });
                }}
              >
                {isPending ? "Suppression…" : "Supprimer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
