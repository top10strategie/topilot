"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  LockSimple,
  MagnifyingGlass,
  PencilSimple,
  Plus,
  Trash,
} from "@phosphor-icons/react";
import { useDrawerStack } from "@/components/drawers/drawer-stack-context";
import { AuditHistoryButton } from "@/components/audit/audit-history-button";
import { EntityDetailsColumns } from "@/components/layout/entity-details-columns";
import { IconActionButton } from "@/components/layout/icon-action-button";
import { PageHero } from "@/components/layout/page-hero";
import { DeleteToolAccessDialog } from "@/components/tools/delete-tool-access-dialog";
import { DeleteToolSubscriptionDialog } from "@/components/tools/delete-tool-subscription-dialog";
import { PasswordRevealDialog } from "@/components/tools/password-reveal-dialog";
import { ToolAccessFormDrawer } from "@/components/tools/tool-access-form-drawer";
import { ToolFormDrawer } from "@/components/tools/tool-form-drawer";
import { ToolSubscriptionInlineForm } from "@/components/tools/tool-subscription-inline-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import type { CategoryItem } from "@/lib/categories/types";
import type { CollaboratorListItem } from "@/lib/collaborators/types";
import { getToolSubscriptionPlanLabel } from "@/lib/tools/labels";
import {
  formatCentsWithCurrency,
  formatPricePeriodLabel,
  isPriceActive,
  planPeriodSuffix,
} from "@/lib/tools/pricing";
import type {
  ToolAccessItem,
  ToolDetail,
  ToolSubscriptionItem,
} from "@/lib/tools/types";

type ClientOption = { id: string; client_name: string };

type ToolDetailPageClientProps = {
  tool: ToolDetail;
  categories: CategoryItem[];
  clients: ClientOption[];
  collaborators: CollaboratorListItem[];
  canManagePrivacy: boolean;
  canViewHistory: boolean;
};

export function ToolDetailPageClient({
  tool,
  categories,
  clients,
  collaborators,
  canManagePrivacy,
  canViewHistory,
}: ToolDetailPageClientProps) {
  const router = useRouter();
  const { pushDrawer } = useDrawerStack();
  const [query, setQuery] = useState("");
  const [revealAccess, setRevealAccess] = useState<ToolAccessItem | null>(
    null,
  );
  const [accessPendingDelete, setAccessPendingDelete] =
    useState<ToolAccessItem | null>(null);
  const [showSubscriptionForm, setShowSubscriptionForm] = useState(false);
  const [editingSubscription, setEditingSubscription] =
    useState<ToolSubscriptionItem | null>(null);
  const [subscriptionPendingDelete, setSubscriptionPendingDelete] =
    useState<ToolSubscriptionItem | null>(null);

  const matchesQuery = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("fr");
    if (!q) return true;
    const blob = [
      tool.tool_name,
      tool.url,
      tool.description,
      ...tool.categories.map((c) => c.label),
      ...tool.clients.map((c) => c.client_name),
      ...tool.accesses.map((a) =>
        [a.label, a.identifier, a.client?.client_name ?? "Interne"].join(" "),
      ),
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("fr");
    return blob.includes(q);
  }, [tool, query]);

  const filteredAccesses = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("fr");
    if (!q) return tool.accesses;
    return tool.accesses.filter((access) => {
      const blob = [
        access.label,
        access.identifier,
        access.client?.client_name ?? "Interne",
      ]
        .join(" ")
        .toLocaleLowerCase("fr");
      return blob.includes(q);
    });
  }, [tool.accesses, query]);

  const openEdit = () => {
    void pushDrawer({
      title: "Édition Outil",
      content: (helpers) => (
        <ToolFormDrawer
          mode="edit"
          tool={tool}
          availableCategories={categories}
          clients={clients}
          collaborators={collaborators}
          canManagePrivacy={canManagePrivacy}
          helpers={helpers}
        />
      ),
    }).then((updated) => {
      if (updated) router.refresh();
    });
  };

  const openCreateAccess = () => {
    void pushDrawer({
      title: "Nouvel accès",
      content: (helpers) => (
        <ToolAccessFormDrawer
          mode="create"
          toolId={tool.id}
          clients={clients}
          collaborators={collaborators}
          availableCategories={categories}
          canManagePrivacy={canManagePrivacy}
          helpers={helpers}
        />
      ),
    }).then((created) => {
      if (created) router.refresh();
    });
  };

  const openEditAccess = (access: ToolAccessItem) => {
    void pushDrawer({
      title: "Édition Accès",
      content: (helpers) => (
        <ToolAccessFormDrawer
          mode="edit"
          toolId={tool.id}
          access={access}
          clients={clients}
          collaborators={collaborators}
          availableCategories={categories}
          canManagePrivacy={canManagePrivacy}
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
        title={tool.tool_name}
        actions={
          <div className="flex w-full max-w-md items-center gap-2 md:w-auto md:max-w-none">
            <div className="relative min-w-0 flex-1 md:w-72 md:flex-none">
              <MagnifyingGlass
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                type="search"
                placeholder="Rechercher…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="pl-8"
                aria-label="Recherche contextuelle fiche outil"
              />
            </div>
            <IconActionButton label="Édition Outil" onClick={openEdit}>
              <PencilSimple className="size-4" />
            </IconActionButton>
            {canViewHistory ? (
              <AuditHistoryButton
                scope={{ kind: "tool", toolId: tool.id }}
                dialogTitle={`Historique — ${tool.tool_name}`}
              />
            ) : null}
          </div>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4 md:px-6">
        {!matchesQuery ? (
          <p className="text-sm text-muted-foreground">
            Aucun résultat pour cette recherche.
          </p>
        ) : (
          <div className="space-y-8">
            <EntityDetailsColumns
              left={
                <div className="space-y-6 text-sm">
                  <section className="space-y-3">
                    <div>
                      <p className="text-muted-foreground">Titre</p>
                      <p className="font-medium">{tool.tool_name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">URL</p>
                      <a
                        href={tool.url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-primary-foreground underline-offset-4 hover:underline"
                      >
                        {tool.url}
                      </a>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Catégories</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {tool.categories.length === 0 ? (
                          <span>—</span>
                        ) : (
                          tool.categories.map((category) => (
                            <Badge key={category.id} variant="secondary">
                              {category.label}
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>
                    {tool.clients.length > 0 ? (
                      <div>
                        <p className="text-muted-foreground">
                          Client(s) lié(s)
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {tool.clients.map((client) => (
                            <Badge key={client.id} variant="outline">
                              {client.client_name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    <div>
                      <p className="text-muted-foreground">Description</p>
                      <p className="whitespace-pre-wrap">
                        {tool.description?.trim() || "Aucune description."}
                      </p>
                    </div>
                  </section>

                  <Separator />

                  <section className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-base font-semibold">Accès</h2>
                      <IconActionButton
                        label="Ajouter un accès"
                        variant="outline"
                        onClick={openCreateAccess}
                      >
                        <Plus className="size-4" />
                      </IconActionButton>
                    </div>

                    {filteredAccesses.length === 0 ? (
                      <p className="text-muted-foreground">
                        {tool.accesses.length === 0
                          ? "Aucun accès pour le moment."
                          : "Aucun accès ne correspond à cette recherche."}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {filteredAccesses.map((access) => (
                          <Card
                            key={access.id}
                            className="flex items-start justify-between gap-2 p-3"
                          >
                            <div className="min-w-0 space-y-1">
                              <div className="flex min-w-0 items-center gap-1.5">
                                <p className="truncate font-medium">
                                  {access.label}
                                </p>
                                {access.is_private ? (
                                  <span
                                    className="inline-flex shrink-0 text-muted-foreground"
                                    title="Accès privé (Manager / Direction)"
                                    aria-label="Accès privé"
                                  >
                                    <LockSimple
                                      className="size-4"
                                      aria-hidden
                                    />
                                  </span>
                                ) : null}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {access.client?.client_name ?? "Interne"}
                              </p>
                            </div>
                            <div className="flex shrink-0 flex-wrap gap-1">
                              <IconActionButton
                                label="Révéler le mot de passe"
                                onClick={() => setRevealAccess(access)}
                              >
                                <Eye className="size-4" />
                              </IconActionButton>
                              <IconActionButton
                                label="Édition Accès"
                                onClick={() => openEditAccess(access)}
                              >
                                <PencilSimple className="size-4" />
                              </IconActionButton>
                              <IconActionButton
                                label="Supprimer l'accès"
                                attention
                                onClick={() => setAccessPendingDelete(access)}
                              >
                                <Trash className="size-4" />
                              </IconActionButton>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              }
              right={
                <section className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-base font-semibold">Abonnement</h2>
                    <IconActionButton
                      label="Ajouter un abonnement"
                      variant="outline"
                      disabled={
                        showSubscriptionForm || Boolean(editingSubscription)
                      }
                      onClick={() => {
                        setEditingSubscription(null);
                        setShowSubscriptionForm(true);
                      }}
                    >
                      <Plus className="size-4" />
                    </IconActionButton>
                  </div>

                  {showSubscriptionForm ? (
                    <ToolSubscriptionInlineForm
                      toolId={tool.id}
                      mode="create"
                      onCancel={() => setShowSubscriptionForm(false)}
                      onSaved={() => {
                        setShowSubscriptionForm(false);
                        router.refresh();
                      }}
                    />
                  ) : null}

                  {editingSubscription ? (
                    <ToolSubscriptionInlineForm
                      toolId={tool.id}
                      mode="edit"
                      subscription={editingSubscription}
                      activePriceId={
                        editingSubscription.prices.find((p) =>
                          isPriceActive(p.valid_to),
                        )?.id
                      }
                      onCancel={() => setEditingSubscription(null)}
                      onSaved={() => {
                        setEditingSubscription(null);
                        router.refresh();
                      }}
                    />
                  ) : null}

                  {tool.subscriptions.length === 0 &&
                  !showSubscriptionForm ? (
                    <p className="text-muted-foreground">
                      Aucun abonnement pour le moment.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {tool.subscriptions.map((subscription) => {
                        const activePrice = subscription.prices.find((p) =>
                          isPriceActive(p.valid_to),
                        );
                        return (
                          <Card key={subscription.id} className="space-y-2 p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-medium">
                                  {subscription.title}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {getToolSubscriptionPlanLabel(
                                    subscription.subscription_plan,
                                  )}
                                </p>
                              </div>
                              <div className="flex shrink-0 gap-1">
                                {activePrice ? (
                                  <IconActionButton
                                    label="Édition abonnement"
                                    onClick={() => {
                                      setShowSubscriptionForm(false);
                                      setEditingSubscription(subscription);
                                    }}
                                  >
                                    <PencilSimple className="size-4" />
                                  </IconActionButton>
                                ) : null}
                                <IconActionButton
                                  label="Supprimer l'abonnement"
                                  attention
                                  onClick={() =>
                                    setSubscriptionPendingDelete(subscription)
                                  }
                                >
                                  <Trash className="size-4" />
                                </IconActionButton>
                              </div>
                            </div>
                            <div className="space-y-1 text-xs text-muted-foreground">
                              {subscription.prices.map((price) => (
                                <div
                                  key={price.id}
                                  className="flex items-center justify-between gap-2"
                                >
                                  <span>
                                    {formatPricePeriodLabel(price.valid_from)}
                                    {isPriceActive(price.valid_to)
                                      ? " (actif)"
                                      : ""}
                                  </span>
                                  <span
                                    className={
                                      isPriceActive(price.valid_to)
                                        ? "font-medium text-foreground"
                                        : undefined
                                    }
                                  >
                                    {formatCentsWithCurrency(
                                      price.amount_cents,
                                      price.currency,
                                    )}
                                    {planPeriodSuffix(
                                      subscription.subscription_plan,
                                    )}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </section>
              }
            />
          </div>
        )}
      </div>

      {revealAccess ? (
        <PasswordRevealDialog
          open
          onClose={() => setRevealAccess(null)}
          vaultSecretId={revealAccess.vault_secret_id}
          accessLabel={revealAccess.label}
          accessIdentifier={revealAccess.identifier}
        />
      ) : null}

      {accessPendingDelete ? (
        <DeleteToolAccessDialog
          open
          onOpenChange={(open) => {
            if (!open) setAccessPendingDelete(null);
          }}
          accessLabel={accessPendingDelete.label}
          accessId={accessPendingDelete.id}
          vaultSecretId={accessPendingDelete.vault_secret_id}
          onDeleted={() => {
            setAccessPendingDelete(null);
            router.refresh();
          }}
        />
      ) : null}

      {subscriptionPendingDelete ? (
        <DeleteToolSubscriptionDialog
          open
          onOpenChange={(open) => {
            if (!open) setSubscriptionPendingDelete(null);
          }}
          subscriptionId={subscriptionPendingDelete.id}
          subscriptionTitle={subscriptionPendingDelete.title}
          onDeleted={() => {
            setSubscriptionPendingDelete(null);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
