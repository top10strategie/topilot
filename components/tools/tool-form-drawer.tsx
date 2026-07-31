"use client";

import { useState, useTransition } from "react";
import { FolderSimplePlus, Plus } from "@phosphor-icons/react";
import { toast } from "sonner";
import { createCategory, updateCategory } from "@/actions/categories";
import { createToolRecord, updateToolRecord } from "@/actions/tools";
import { CategoryMultiCombobox } from "@/components/categories/category-multi-combobox";
import { LabelEntityFormDrawer } from "@/components/categories/label-entity-form-drawer";
import type { DrawerHelpers } from "@/components/drawers/drawer-stack-context";
import { useDrawerStack } from "@/components/drawers/drawer-stack-context";
import { ToolAccessFormDrawer } from "@/components/tools/tool-access-form-drawer";
import { ToolSubscriptionInlineForm } from "@/components/tools/tool-subscription-inline-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CategoryItem } from "@/lib/categories/types";
import type { CollaboratorListItem } from "@/lib/collaborators/types";
import type { ToolCategoryItem, ToolDetail } from "@/lib/tools/types";

type ClientOption = { id: string; client_name: string };

type ToolFormDrawerProps = {
  mode: "create" | "edit";
  tool?: ToolDetail;
  availableCategories: CategoryItem[];
  clients?: ClientOption[];
  collaborators?: CollaboratorListItem[];
  canManagePrivacy?: boolean;
  helpers: DrawerHelpers<{ id: string; tool_name: string }>;
};

/**
 * Tiroir "Nouvel outil" (création 2 temps) / "Édition Outil" (save unique).
 * L'identification (nom, URL, catégories, description) crée l'outil dès la
 * première étape — nécessaire pour permettre l'ajout d'un premier accès et
 * d'un abonnement (cf. `10_ux_architecture.mdc` § Page tools).
 */
export function ToolFormDrawer({
  mode,
  tool,
  availableCategories = [],
  clients = [],
  collaborators = [],
  canManagePrivacy = false,
  helpers,
}: ToolFormDrawerProps) {
  const { pushDrawer } = useDrawerStack();

  const [toolId, setToolId] = useState(tool?.id ?? "");
  const [identificationSaved, setIdentificationSaved] = useState(
    mode === "edit",
  );
  const [hasFirstAccess, setHasFirstAccess] = useState(
    (tool?.accesses?.length ?? 0) > 0,
  );
  const [firstAccessLabel, setFirstAccessLabel] = useState<string | null>(
    () => tool?.accesses?.[0]?.label ?? null,
  );
  const [hasSubscription, setHasSubscription] = useState(
    (tool?.subscriptions?.length ?? 0) > 0,
  );
  const [showSubscriptionForm, setShowSubscriptionForm] = useState(false);

  const [toolName, setToolName] = useState(tool?.tool_name ?? "");
  const [url, setUrl] = useState(tool?.url ?? "");
  const [description, setDescription] = useState(tool?.description ?? "");

  const [categories, setCategories] = useState<ToolCategoryItem[]>(() => {
    const byId = new Map<string, ToolCategoryItem>();
    for (const item of availableCategories) byId.set(item.id, item);
    for (const item of tool?.categories ?? []) byId.set(item.id, item);
    return [...byId.values()].sort((a, b) =>
      a.label.localeCompare(b.label, "fr"),
    );
  });
  const [selectedCategories, setSelectedCategories] = useState<
    ToolCategoryItem[]
  >(() => [...(tool?.categories ?? [])]);

  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<"tool_name" | "url", string>>
  >({});
  const [isPending, startTransition] = useTransition();

  const injectCategory = (item: ToolCategoryItem) => {
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

  const openFirstAccess = async () => {
    if (!toolId || hasFirstAccess) return;
    const created = await pushDrawer<{ id: string; label?: string }>({
      title: "Premier accès",
      content: (nested) => (
        <ToolAccessFormDrawer
          mode="create"
          toolId={toolId}
          clients={clients}
          collaborators={collaborators}
          availableCategories={availableCategories}
          canManagePrivacy={canManagePrivacy}
          helpers={nested}
        />
      ),
    });
    if (created) {
      setHasFirstAccess(true);
      if (created.label) setFirstAccessLabel(created.label);
    }
  };

  const buildFormData = (): FormData => {
    const formData = new FormData();
    formData.set("tool_name", toolName);
    formData.set("url", url);
    formData.set("description", description);
    for (const category of selectedCategories) {
      formData.append("category_ids", category.id);
    }
    return formData;
  };

  const handleSaveIdentification = () => {
    setFieldErrors({});

    startTransition(async () => {
      const result = await createToolRecord(buildFormData());
      if (!result.success) {
        setFieldErrors(result.fieldErrors ?? {});
        toast.error(result.error);
        return;
      }
      setToolId(result.id);
      setIdentificationSaved(true);
      toast.success("Outil créé.");
    });
  };

  const handleSubmit = () => {
    if (mode === "create" && !identificationSaved) {
      handleSaveIdentification();
      return;
    }

    setFieldErrors({});
    startTransition(async () => {
      const result = await updateToolRecord(toolId, buildFormData());
      if (!result.success) {
        setFieldErrors(result.fieldErrors ?? {});
        toast.error(result.error);
        return;
      }

      toast.success(
        mode === "create" ? "Outil enregistré." : "Outil mis à jour.",
      );
      helpers.resolve({ id: result.id, tool_name: toolName.trim() });
    });
  };

  const showComplement = mode === "create" && identificationSaved;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-6">
        <section className="space-y-4">
          <h3 className="text-sm font-semibold">Identification</h3>

          <div className="grid gap-2">
            <Label htmlFor="tool_name">
              Nom de l&apos;outil <span className="text-destructive">*</span>
            </Label>
            <Input
              id="tool_name"
              value={toolName}
              onChange={(event) => setToolName(event.target.value)}
              disabled={isPending}
              required
              autoFocus
              aria-invalid={Boolean(fieldErrors.tool_name)}
            />
            {fieldErrors.tool_name ? (
              <p className="text-sm text-destructive">
                {fieldErrors.tool_name}
              </p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="tool_url">
              URL <span className="text-destructive">*</span>
            </Label>
            <Input
              id="tool_url"
              type="url"
              placeholder="https://…"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              disabled={isPending}
              required
              aria-invalid={Boolean(fieldErrors.url)}
            />
            {fieldErrors.url ? (
              <p className="text-sm text-destructive">{fieldErrors.url}</p>
            ) : null}
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
            <Label htmlFor="tool_description">Description</Label>
            <Textarea
              id="tool_description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={isPending}
              rows={4}
            />
          </div>

          {mode === "create" && !identificationSaved ? (
            <div className="flex justify-end">
              <Button
                type="button"
                disabled={isPending}
                onClick={handleSaveIdentification}
              >
                {isPending ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </div>
          ) : null}
        </section>

        {showComplement ? (
          <section className="space-y-4 border-t pt-4">
            <h3 className="text-sm font-semibold">Complément</h3>

            <section className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-medium">
                  Premier accès (optionnel)
                </h4>
                {!hasFirstAccess ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={isPending || !toolId}
                    onClick={() => void openFirstAccess()}
                  >
                    <Plus className="size-3.5" aria-hidden />
                    Ajouter
                  </Button>
                ) : null}
              </div>
              {hasFirstAccess ? (
                <p className="text-sm text-muted-foreground">
                  {firstAccessLabel ? (
                    <>
                      Accès « {firstAccessLabel} » créé. Vous pourrez en ajouter
                      d&apos;autres depuis la fiche de l&apos;outil.
                    </>
                  ) : (
                    <>
                      Un premier accès a été créé. Vous pourrez en ajouter
                      d&apos;autres depuis la fiche de l&apos;outil.
                    </>
                  )}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Identifiant et mot de passe (Vault). Client optionnel ;
                  toggle Privé réservé Manager / Direction.
                </p>
              )}
            </section>

            <section className="space-y-2 border-t pt-4">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-medium">Abonnement</h4>
                {!hasSubscription && !showSubscriptionForm ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={isPending || !toolId}
                    onClick={() => setShowSubscriptionForm(true)}
                  >
                    <Plus className="size-3.5" aria-hidden />
                    Ajouter
                  </Button>
                ) : null}
              </div>
              {showSubscriptionForm && toolId ? (
                <ToolSubscriptionInlineForm
                  toolId={toolId}
                  mode="create"
                  onCancel={() => setShowSubscriptionForm(false)}
                  onSaved={() => {
                    setShowSubscriptionForm(false);
                    setHasSubscription(true);
                  }}
                />
              ) : null}
              {hasSubscription ? (
                <p className="text-sm text-muted-foreground">
                  Un abonnement a été créé. Vous pourrez en gérer d&apos;autres
                  depuis la fiche de l&apos;outil.
                </p>
              ) : !showSubscriptionForm ? (
                <p className="text-sm text-muted-foreground">
                  Titre, facturation mensuelle/annuelle, montant et devise.
                </p>
              ) : null}
            </section>
          </section>
        ) : null}
      </div>

      {mode === "edit" || showComplement ? (
        <div className="mt-6 flex shrink-0 justify-end gap-2 border-t pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => helpers.dismiss()}
            disabled={isPending}
          >
            Annuler
          </Button>
          <Button
            type="button"
            disabled={isPending}
            onClick={handleSubmit}
          >
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
    </div>
  );
}
