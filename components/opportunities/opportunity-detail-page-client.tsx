"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MagnifyingGlass, PencilSimple } from "@phosphor-icons/react";
import { ClientConsultationDrawer } from "@/components/clients/client-consultation-drawer";
import { useDrawerStack } from "@/components/drawers/drawer-stack-context";
import { EntityDetailsColumns } from "@/components/layout/entity-details-columns";
import { EntityDocumentationSection } from "@/components/layout/entity-documentation-columns";
import { IconActionButton } from "@/components/layout/icon-action-button";
import { PageHero } from "@/components/layout/page-hero";
import { OpportunityFormDrawer } from "@/components/opportunities/opportunity-form-drawer";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CategoryItem } from "@/lib/categories/types";
import type { ClientDetail, ClientListItem } from "@/lib/clients/types";
import { getContactFullName } from "@/lib/clients/labels";
import type { CollaboratorListItem } from "@/lib/collaborators/types";
import {
  formatOpportunityDate,
  formatOpportunityPrice,
  formatOpportunityProbability,
  getOpportunityKanbanStatusLabel,
  getOpportunityPriorityLabel,
  getOpportunityResponsibleName,
} from "@/lib/opportunities/labels";
import type {
  OpportunityContactOption,
  OpportunityDetail,
} from "@/lib/opportunities/types";

type OpportunityDetailPageClientProps = {
  opportunity: OpportunityDetail;
  collaborators: CollaboratorListItem[];
  clients: ClientListItem[];
  linkedClient: ClientDetail | null;
  contacts: OpportunityContactOption[];
  categories: CategoryItem[];
};

export function OpportunityDetailPageClient({
  opportunity,
  collaborators,
  clients,
  linkedClient,
  contacts,
  categories,
}: OpportunityDetailPageClientProps) {
  const router = useRouter();
  const { pushDrawer } = useDrawerStack();
  const [tab, setTab] = useState("informations");
  const [query, setQuery] = useState("");

  const matchesQuery = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("fr");
    if (!q || tab !== "informations") return true;
    const blob = [
      opportunity.opportunity_name,
      opportunity.client.client_name,
      opportunity.contact
        ? getContactFullName(opportunity.contact)
        : "",
      getOpportunityResponsibleName(opportunity.responsible),
      getOpportunityKanbanStatusLabel(opportunity.kanban_status),
      getOpportunityPriorityLabel(opportunity.priority),
      opportunity.action,
      opportunity.source,
      opportunity.notes,
      ...opportunity.categories.map((c) => c.label),
    ]
      .join(" ")
      .toLocaleLowerCase("fr");
    return blob.includes(q);
  }, [opportunity, query, tab]);

  const openEdit = () => {
    void pushDrawer({
      title: "Édition Opportunité",
      content: (helpers) => (
        <OpportunityFormDrawer
          mode="edit"
          opportunity={opportunity}
          collaborators={collaborators}
          clients={clients}
          contacts={contacts}
          availableCategories={categories}
          helpers={helpers}
        />
      ),
    }).then((updated) => {
      if (updated) router.refresh();
    });
  };

  const openClientConsultation = () => {
    if (!linkedClient) return;
    void pushDrawer({
      title: linkedClient.client_name,
      content: (helpers) => (
        <ClientConsultationDrawer client={linkedClient} helpers={helpers} />
      ),
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHero
        title={opportunity.opportunity_name}
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
                aria-label="Recherche contextuelle fiche opportunité"
              />
            </div>
            <IconActionButton
              label="Édition Opportunité"
              onClick={openEdit}
            >
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
            className="mt-4 min-h-0 flex-1 overflow-y-auto"
          >
            {!matchesQuery ? (
              <p className="text-sm text-muted-foreground">
                Aucun résultat pour cette recherche.
              </p>
            ) : (
              <EntityDetailsColumns
                left={
                  <>
                    <section className="space-y-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Titre</p>
                        <p className="font-medium">
                          {opportunity.opportunity_name}
                        </p>
                        {!opportunity.is_active ? (
                          <Badge variant="secondary" className="mt-1">
                            Archivée
                          </Badge>
                        ) : null}
                      </div>
                      <div>
                        <p className="text-muted-foreground">Client</p>
                        {linkedClient ? (
                          <button
                            type="button"
                            onClick={openClientConsultation}
                            className="font-bold text-primary-foreground underline-offset-4 hover:underline"
                          >
                            {opportunity.client.client_name}
                          </button>
                        ) : (
                          <p className="font-bold text-primary-foreground">
                            {opportunity.client.client_name}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-muted-foreground">Contact</p>
                        <p>
                          {opportunity.contact
                            ? getContactFullName(opportunity.contact)
                            : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">
                          Responsable opportunité
                        </p>
                        <p>
                          {getOpportunityResponsibleName(
                            opportunity.responsible,
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Catégories</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {opportunity.categories.length === 0 ? (
                            <span>—</span>
                          ) : (
                            opportunity.categories.map((category) => (
                              <Badge key={category.id} variant="secondary">
                                {category.label}
                              </Badge>
                            ))
                          )}
                        </div>
                      </div>
                    </section>

                    <section className="space-y-2 text-sm">
                      <h2 className="text-base font-semibold">Notes</h2>
                      <p className="whitespace-pre-wrap text-muted-foreground">
                        {opportunity.notes?.trim() || "Aucune note."}
                      </p>
                    </section>
                  </>
                }
                right={
                  <section className="space-y-3 text-sm">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="shrink-0 text-muted-foreground">
                        Statut
                      </span>
                      <span className="text-right">
                        {getOpportunityKanbanStatusLabel(
                          opportunity.kanban_status,
                        )}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="shrink-0 text-muted-foreground">
                        Montant
                      </span>
                      <span className="text-right">
                        {formatOpportunityPrice(opportunity.price)}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="shrink-0 text-muted-foreground">
                        Montant pondéré
                      </span>
                      <span className="text-right">
                        {formatOpportunityPrice(opportunity.average_price)}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="shrink-0 text-muted-foreground">
                        Probabilité de réussite
                      </span>
                      <span className="text-right">
                        {formatOpportunityProbability(
                          opportunity.probability_confirmation,
                        )}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="shrink-0 text-muted-foreground">
                        Urgence
                      </span>
                      <span className="text-right">
                        {getOpportunityPriorityLabel(opportunity.priority)}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="shrink-0 text-muted-foreground">
                        Action
                      </span>
                      <span className="text-right">
                        {opportunity.action?.trim() || "—"}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="shrink-0 text-muted-foreground">
                        Source
                      </span>
                      <span className="text-right">
                        {opportunity.source?.trim() || "—"}
                      </span>
                    </div>
                    <div>
                      <p className="text-muted-foreground">
                        Date de dernière rencontre
                      </p>
                      <p>
                        {formatOpportunityDate(opportunity.last_meeting_at)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Échéance</p>
                      <p>{formatOpportunityDate(opportunity.due_date_at)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Date de clôture</p>
                      <p className="font-bold text-primary-foreground">
                        {formatOpportunityDate(opportunity.end_at)}
                      </p>
                    </div>
                  </section>
                }
              />
            )}
          </TabsContent>

          <TabsContent value="missions" className="mt-4 space-y-2">
            <p className="text-sm text-muted-foreground">
              Les missions liées seront disponibles au point Pipe production.
            </p>
          </TabsContent>

          <TabsContent value="documentations" className="mt-4">
            <div className="grid gap-6 md:grid-cols-2">
              <EntityDocumentationSection title="Documents">
                <p className="text-sm text-muted-foreground">
                  Disponible au point Wiki &amp; Documents.
                </p>
              </EntityDocumentationSection>
              <EntityDocumentationSection title="Outils">
                <p className="text-sm text-muted-foreground">
                  Disponible au point Toolbox.
                </p>
              </EntityDocumentationSection>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
