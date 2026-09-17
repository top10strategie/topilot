"use client";

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import {
  createRevenueAim,
  updateRevenueAim,
} from "@/actions/revenue-aim";
import { DrawerBody, DrawerFooterActions } from "@/components/drawers/drawer-section";
import type { DrawerHelpers } from "@/components/drawers/drawer-stack-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type RevenueAimFormResult = {
  id: string;
  year: number;
  amount: number;
};

type RevenueAimFormDrawerProps = {
  mode: "create" | "edit";
  entityId?: string;
  initialYear?: number;
  initialAmount?: number;
  helpers: DrawerHelpers<RevenueAimFormResult>;
};

/**
 * Formulaire création / édition d'un objectif de CA annuel.
 */
export function RevenueAimFormDrawer({
  mode,
  entityId,
  initialYear,
  initialAmount,
  helpers,
}: RevenueAimFormDrawerProps) {
  const [year, setYear] = useState(
    initialYear != null ? String(initialYear) : "",
  );
  const [amount, setAmount] = useState(
    initialAmount != null ? String(initialAmount) : "",
  );
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<"year" | "amount", string>>
  >({});
  const [isPending, startTransition] = useTransition();
  const submitLabel = mode === "create" ? "Créer" : "Enregistrer";

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setFieldErrors({});

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createRevenueAim({ year, amount })
          : await updateRevenueAim(entityId!, { year, amount });

      if (!result.success) {
        setFieldErrors(result.fieldErrors ?? {});
        toast.error(result.error ?? "Enregistrement impossible.");
        return;
      }

      toast.success(
        mode === "create" ? "Objectif créé." : "Objectif mis à jour.",
      );
      helpers.resolve({
        id: result.id,
        year: result.year,
        amount: result.amount,
      });
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <DrawerBody>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="revenue_aim_year">
              Année <span className="text-destructive">*</span>
            </Label>
            <Input
              id="revenue_aim_year"
              inputMode="numeric"
              value={year}
              onChange={(event) => setYear(event.target.value)}
              disabled={isPending}
              required
              autoFocus
              aria-invalid={Boolean(fieldErrors.year)}
            />
            {fieldErrors.year ? (
              <p className="text-sm text-destructive">{fieldErrors.year}</p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="revenue_aim_amount">
              Montant (€) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="revenue_aim_amount"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              disabled={isPending}
              required
              aria-invalid={Boolean(fieldErrors.amount)}
            />
            {fieldErrors.amount ? (
              <p className="text-sm text-destructive">{fieldErrors.amount}</p>
            ) : null}
          </div>
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
          {isPending ? "Enregistrement…" : submitLabel}
        </Button>
      </DrawerFooterActions>
    </form>
  );
}
