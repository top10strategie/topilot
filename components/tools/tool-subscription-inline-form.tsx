"use client";

import { useState, useTransition, type KeyboardEvent } from "react";
import { toast } from "sonner";
import {
  createToolSubscriptionRecord,
  updateToolSubscriptionRecord,
} from "@/actions/tool-subscriptions";
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
import {
  centsToEuroInput,
  eurosToCents,
  todayYmd,
} from "@/lib/tools/pricing";
import type {
  ToolSubscriptionItem,
  ToolSubscriptionPlan,
} from "@/lib/tools/types";

type ToolSubscriptionInlineFormProps = {
  toolId: string;
  mode: "create" | "edit";
  subscription?: ToolSubscriptionItem;
  /** Prix actif à éditer (requis en mode edit). */
  activePriceId?: string;
  onCancel: () => void;
  onSaved: () => void;
};

/**
 * Mini-formulaire inline abonnement (création / édition tarif actif).
 * Utilise un `div` (pas de `<form>`) pour pouvoir s'imbriquer dans le
 * tiroir "Nouvel outil" sans formulaire HTML imbriqué.
 */
export function ToolSubscriptionInlineForm({
  toolId,
  mode,
  subscription,
  activePriceId,
  onCancel,
  onSaved,
}: ToolSubscriptionInlineFormProps) {
  const activePrice = subscription?.prices.find((p) => p.id === activePriceId);

  const [title, setTitle] = useState(subscription?.title ?? "");
  const [isMonthly, setIsMonthly] = useState(
    (subscription?.subscription_plan ?? "mensuel") === "mensuel",
  );
  const [amountInput, setAmountInput] = useState(
    activePrice ? centsToEuroInput(activePrice.amount_cents) : "",
  );
  const [currency, setCurrency] = useState(activePrice?.currency ?? "EUR");
  const [validFrom, setValidFrom] = useState(
    activePrice?.valid_from ?? todayYmd(),
  );
  const [validTo, setValidTo] = useState(activePrice?.valid_to ?? "");
  const [isPending, startTransition] = useTransition();

  const save = () => {
    const amountCents = eurosToCents(amountInput);
    if (amountCents == null || amountCents <= 0) {
      toast.error("Montant invalide.");
      return;
    }
    if (!title.trim()) {
      toast.error("Le titre est obligatoire.");
      return;
    }

    const plan: ToolSubscriptionPlan = isMonthly ? "mensuel" : "annuel";
    const draft = {
      title: title.trim(),
      subscription_plan: plan,
      amount_cents: amountCents,
      currency,
      valid_from: validFrom,
      valid_to: validTo.trim() || null,
    };

    startTransition(async () => {
      if (mode === "create") {
        const result = await createToolSubscriptionRecord({
          tool_id: toolId,
          draft,
        });
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success("Abonnement créé.");
        onSaved();
        return;
      }

      if (!subscription || !activePriceId) {
        toast.error("Abonnement introuvable.");
        return;
      }

      const result = await updateToolSubscriptionRecord({
        subscription_id: subscription.id,
        active_price_id: activePriceId,
        draft,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Abonnement mis à jour.");
      onSaved();
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter") return;
    const target = event.target as HTMLElement;
    if (target.tagName === "TEXTAREA") return;
    event.preventDefault();
    event.stopPropagation();
    if (!isPending) save();
  };

  return (
    <div
      className="space-y-3 rounded-lg border border-border p-3"
      onKeyDown={handleKeyDown}
    >
      <div className="grid gap-2">
        <Label htmlFor="sub_title">
          Titre <span className="text-destructive">*</span>
        </Label>
        <Input
          id="sub_title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          disabled={isPending}
          required
        />
      </div>

      <div className="grid gap-2">
        <Label>Facturation mensuelle</Label>
        <Select
          value={isMonthly ? "yes" : "no"}
          onValueChange={(value) => setIsMonthly(value === "yes")}
          disabled={isPending}
        >
          <SelectTrigger aria-label="Facturation mensuelle">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="yes">Oui (mensuel)</SelectItem>
            <SelectItem value="no">Non (annuel)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-2">
          <Label htmlFor="sub_amount">
            Montant <span className="text-destructive">*</span>
          </Label>
          <Input
            id="sub_amount"
            inputMode="decimal"
            placeholder="0,00"
            value={amountInput}
            onChange={(event) => setAmountInput(event.target.value)}
            disabled={isPending}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="sub_currency">Devise</Label>
          <Input
            id="sub_currency"
            value={currency}
            onChange={(event) =>
              setCurrency(event.target.value.toUpperCase().slice(0, 3))
            }
            disabled={isPending}
            maxLength={3}
            placeholder="EUR"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-2">
          <Label htmlFor="sub_valid_from">
            Date de début <span className="text-destructive">*</span>
          </Label>
          <Input
            id="sub_valid_from"
            type="date"
            value={validFrom}
            onChange={(event) => setValidFrom(event.target.value)}
            disabled={isPending}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="sub_valid_to">Date de fin</Label>
          <Input
            id="sub_valid_to"
            type="date"
            value={validTo}
            onChange={(event) => setValidTo(event.target.value)}
            disabled={isPending}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isPending}
        >
          Annuler
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={isPending}
          onClick={save}
        >
          {isPending
            ? "Enregistrement…"
            : mode === "create"
              ? "Ajouter"
              : "Enregistrer"}
        </Button>
      </div>
    </div>
  );
}
