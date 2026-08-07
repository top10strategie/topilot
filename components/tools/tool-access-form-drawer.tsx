"use client";

import { useState, useTransition, type FormEvent } from "react";
import { UserPlus } from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  createToolAccessRecord,
  updateToolAccessRecord,
} from "@/actions/tool-access";
import { ClientFormDrawer } from "@/components/clients/client-form-drawer";
import { DrawerBody, DrawerFooterActions } from "@/components/drawers/drawer-section";
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
import type { CategoryItem } from "@/lib/categories/types";
import type { CollaboratorListItem } from "@/lib/collaborators/types";
import type { ToolAccessItem } from "@/lib/tools/types";

export type ToolAccessClientOption = {
  id: string;
  client_name: string;
};

type ToolAccessFormDrawerProps = {
  mode: "create" | "edit";
  toolId: string;
  access?: ToolAccessItem;
  clients: ToolAccessClientOption[];
  collaborators?: CollaboratorListItem[];
  availableCategories?: CategoryItem[];
  /** Manager / Direction — bascule Privé. */
  canManagePrivacy: boolean;
  helpers: DrawerHelpers<{ id: string; label?: string }>;
};

/**
 * Tiroir création / édition d'un accès outil (Vault + `tool_access`).
 */
export function ToolAccessFormDrawer({
  mode,
  toolId,
  access,
  clients: initialClients,
  collaborators = [],
  availableCategories = [],
  canManagePrivacy,
  helpers,
}: ToolAccessFormDrawerProps) {
  const { pushDrawer } = useDrawerStack();
  const [label, setLabel] = useState(access?.label ?? "");
  const [identifier, setIdentifier] = useState(access?.identifier ?? "");
  const [password, setPassword] = useState("");
  const [clientId, setClientId] = useState(access?.client_id ?? "");
  const [clients, setClients] = useState<ToolAccessClientOption[]>(() =>
    [...initialClients]
      .filter((c) => Boolean(c.id))
      .sort((a, b) => a.client_name.localeCompare(b.client_name, "fr")),
  );
  const [isPrivate, setIsPrivate] = useState(
    canManagePrivacy ? Boolean(access?.is_private) : false,
  );
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<"label" | "identifier" | "password", string>>
  >({});
  const [isPending, startTransition] = useTransition();

  const canCreateClient = collaborators.length > 0;

  const openCreateClient = async () => {
    if (!canCreateClient) return;
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
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: typeof fieldErrors = {};
    const trimmedLabel = label.trim();
    const trimmedIdentifier = identifier.trim();

    if (!trimmedLabel) nextErrors.label = "Le label est obligatoire.";
    if (!trimmedIdentifier) {
      nextErrors.identifier = "L'identifiant est obligatoire.";
    }
    if (mode === "create" && !password) {
      nextErrors.password = "Le mot de passe est obligatoire.";
    }

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast.error("Corrigez les erreurs du formulaire.");
      return;
    }

    startTransition(async () => {
      if (mode === "create") {
        const result = await createToolAccessRecord({
          tool_id: toolId,
          label: trimmedLabel,
          identifier: trimmedIdentifier,
          password,
          client_id: clientId || null,
          is_private: canManagePrivacy ? isPrivate : false,
        });
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success("Accès créé.");
        helpers.resolve({ id: result.id, label: trimmedLabel });
        return;
      }

      if (!access) {
        toast.error("Accès introuvable.");
        return;
      }

      const result = await updateToolAccessRecord({
        id: access.id,
        label: trimmedLabel,
        identifier: trimmedIdentifier,
        password: password || undefined,
        client_id: clientId || null,
        is_private: canManagePrivacy ? isPrivate : access.is_private,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Accès mis à jour.");
      helpers.resolve({ id: result.id, label: trimmedLabel });
    });
  };

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={handleSubmit}
      noValidate
    >
      <DrawerBody>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Label className="shrink-0">Client</Label>
            <Select
              value={clientId || "__interne__"}
              onValueChange={(value) =>
                setClientId(value === "__interne__" ? "" : value)
              }
              disabled={isPending}
            >
              <SelectTrigger
                className="min-w-0 flex-1 basis-[10rem]"
                aria-label="Client lié à l'accès"
              >
                <SelectValue placeholder="Interne (aucun client)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__interne__">
                  Interne (aucun client)
                </SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.client_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {canCreateClient ? (
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0"
                aria-label="Nouveau client"
                title="Nouveau client"
                disabled={isPending}
                onClick={() => void openCreateClient()}
              >
                <UserPlus className="size-4" />
              </Button>
            ) : null}
            {canManagePrivacy ? (
              <>
                <Label className="shrink-0 pl-4">Privé</Label>
                <Select
                  value={isPrivate ? "yes" : "no"}
                  onValueChange={(value) => setIsPrivate(value === "yes")}
                  disabled={isPending}
                >
                  <SelectTrigger
                    className="w-[6.5rem] shrink-0"
                    aria-label="Accès privé"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Oui</SelectItem>
                    <SelectItem value="no">Non</SelectItem>
                  </SelectContent>
                </Select>
              </>
            ) : null}
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="access_label">
            Label <span className="text-destructive">*</span>
          </Label>
          <Input
            id="access_label"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            disabled={isPending}
            aria-invalid={Boolean(fieldErrors.label)}
          />
          {fieldErrors.label ? (
            <p className="text-sm text-destructive">{fieldErrors.label}</p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="access_identifier">
            Identifiant <span className="text-destructive">*</span>
          </Label>
          <Input
            id="access_identifier"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            disabled={isPending}
            autoComplete="username"
            aria-invalid={Boolean(fieldErrors.identifier)}
          />
          {fieldErrors.identifier ? (
            <p className="text-sm text-destructive">{fieldErrors.identifier}</p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="access_password">
            {mode === "create" ? (
              <>
                Mot de passe <span className="text-destructive">*</span>
              </>
            ) : (
              "Nouveau mot de passe"
            )}
          </Label>
          <Input
            id="access_password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isPending}
            autoComplete="new-password"
            aria-invalid={Boolean(fieldErrors.password)}
            placeholder={
              mode === "edit" ? "Laisser vide pour conserver" : undefined
            }
          />
          {fieldErrors.password ? (
            <p className="text-sm text-destructive">{fieldErrors.password}</p>
          ) : null}
          {mode === "edit" ? (
            <p className="text-xs text-muted-foreground">
              Laissez vide pour conserver le mot de passe actuel.
            </p>
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
          {isPending
            ? "Enregistrement…"
            : mode === "create"
              ? "Créer"
              : "Enregistrer"}
        </Button>
      </DrawerFooterActions>
    </form>
  );
}
