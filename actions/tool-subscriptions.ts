"use server";

import { revalidatePath } from "next/cache";
import { requireActiveCollaboratorAction } from "@/lib/auth/require-action";
import { scheduleExchangeRateSyncIfNewCurrency } from "@/lib/exchange-rate/trigger-sync";
import { createClient } from "@/lib/supabase/server";
import {
  dayBeforeYmd,
  isPriceActive,
  resolveSubscriptionCurrency,
} from "@/lib/tools/pricing";
import type { ToolSubscriptionPlan } from "@/lib/tools/types";
import { isUuid } from "@/lib/uuid";

export type ToolSubscriptionActionResult =
  | { success: true; id: string }
  | { success: false; error: string };

export type DeleteToolSubscriptionResult =
  | { success: true }
  | { success: false; error: string };

const DATE_YMD = /^\d{4}-\d{2}-\d{2}$/;

export type ToolSubscriptionDraft = {
  title: string;
  subscription_plan: ToolSubscriptionPlan;
  amount_cents: number;
  currency: string;
  valid_from: string;
  valid_to?: string | null;
};

function revalidateTool(toolId: string) {
  revalidatePath("/tools");
  revalidatePath(`/tools/${toolId}`);
}

function validateDraft(
  draft: ToolSubscriptionDraft,
): { ok: true; draft: ToolSubscriptionDraft } | { ok: false; message: string } {
  const title = draft.title.trim();
  if (!title) {
    return { ok: false, message: "Le titre de l'abonnement est obligatoire." };
  }
  if (draft.amount_cents <= 0) {
    return { ok: false, message: "Le montant doit être supérieur à zéro." };
  }
  if (
    draft.subscription_plan !== "annuel" &&
    draft.subscription_plan !== "mensuel"
  ) {
    return { ok: false, message: "Plan d'abonnement invalide." };
  }
  const currency = resolveSubscriptionCurrency(draft.currency);
  if (!currency) {
    return { ok: false, message: "Code devise invalide (ISO 4217, ex. EUR)." };
  }
  const validFrom = draft.valid_from.trim();
  if (!DATE_YMD.test(validFrom)) {
    return { ok: false, message: "Date de début invalide." };
  }
  const validToRaw = draft.valid_to?.trim();
  const validTo = validToRaw && validToRaw.length > 0 ? validToRaw : null;
  if (validTo != null) {
    if (!DATE_YMD.test(validTo)) {
      return { ok: false, message: "Date de fin invalide." };
    }
    if (validTo <= validFrom) {
      return {
        ok: false,
        message: "La date de fin doit être postérieure à la date de début.",
      };
    }
  }
  return {
    ok: true,
    draft: {
      ...draft,
      title,
      currency,
      valid_from: validFrom,
      valid_to: validTo,
    },
  };
}

export async function createToolSubscriptionRecord(input: {
  tool_id: string;
  draft: ToolSubscriptionDraft;
}): Promise<ToolSubscriptionActionResult> {
  const auth = await requireActiveCollaboratorAction();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  const toolId = input.tool_id.trim();
  if (!isUuid(toolId)) {
    return { success: false, error: "Outil invalide." };
  }

  const v = validateDraft(input.draft);
  if (!v.ok) {
    return { success: false, error: v.message };
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: inserted, error: subErr } = await supabase
    .from("tool_subscription")
    .insert({
      tool_id: toolId,
      title: v.draft.title,
      subscription_plan: v.draft.subscription_plan,
      updated_at: now,
    })
    .select("id")
    .single();

  if (subErr || !inserted) {
    return {
      success: false,
      error: subErr?.message
        ? `Impossible de créer l'abonnement : ${subErr.message}`
        : "Impossible de créer l'abonnement.",
    };
  }

  const subscriptionId = inserted.id as string;
  const { error: priceErr } = await supabase
    .from("tool_subscription_price")
    .insert({
      tool_subscription_id: subscriptionId,
      currency: v.draft.currency,
      amount: v.draft.amount_cents,
      valid_from: v.draft.valid_from,
      valid_to: v.draft.valid_to ?? null,
    });

  if (priceErr) {
    await supabase.from("tool_subscription").delete().eq("id", subscriptionId);
    return {
      success: false,
      error: `Impossible de créer le tarif : ${priceErr.message}`,
    };
  }

  scheduleExchangeRateSyncIfNewCurrency(v.draft.currency);
  revalidateTool(toolId);
  return { success: true, id: subscriptionId };
}

/**
 * Met à jour titre / plan et le tarif actif.
 * Si `valid_from` change, clôture l'ancien tarif et en crée un nouveau.
 */
export async function updateToolSubscriptionRecord(input: {
  subscription_id: string;
  active_price_id: string;
  draft: ToolSubscriptionDraft;
}): Promise<ToolSubscriptionActionResult> {
  const auth = await requireActiveCollaboratorAction();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  if (!isUuid(input.subscription_id) || !isUuid(input.active_price_id)) {
    return { success: false, error: "Identifiants invalides." };
  }

  const v = validateDraft(input.draft);
  if (!v.ok) {
    return { success: false, error: v.message };
  }

  const supabase = await createClient();

  const { data: existingPrice, error: fetchErr } = await supabase
    .from("tool_subscription_price")
    .select(
      "id, tool_subscription_id, currency, amount, valid_from, valid_to",
    )
    .eq("id", input.active_price_id)
    .maybeSingle();

  if (fetchErr || !existingPrice) {
    return { success: false, error: "Tarif introuvable." };
  }

  if (existingPrice.tool_subscription_id !== input.subscription_id) {
    return { success: false, error: "Tarif incohérent avec l'abonnement." };
  }

  if (!isPriceActive(existingPrice.valid_to as string | null)) {
    return {
      success: false,
      error: "Seul un tarif actif peut être modifié.",
    };
  }

  const { data: subRow, error: subFetchErr } = await supabase
    .from("tool_subscription")
    .select("id, tool_id")
    .eq("id", input.subscription_id)
    .maybeSingle();

  if (subFetchErr || !subRow) {
    return { success: false, error: "Abonnement introuvable." };
  }

  const toolId = subRow.tool_id as string;
  const now = new Date().toISOString();

  const { error: metaErr } = await supabase
    .from("tool_subscription")
    .update({
      title: v.draft.title,
      subscription_plan: v.draft.subscription_plan,
      updated_at: now,
    })
    .eq("id", input.subscription_id);

  if (metaErr) {
    return {
      success: false,
      error: `Impossible de mettre à jour l'abonnement : ${metaErr.message}`,
    };
  }

  const priceUnchanged =
    existingPrice.amount === v.draft.amount_cents &&
    existingPrice.currency === v.draft.currency &&
    existingPrice.valid_from === v.draft.valid_from &&
    (existingPrice.valid_to ?? null) === (v.draft.valid_to ?? null);

  if (priceUnchanged) {
    revalidateTool(toolId);
    return { success: true, id: input.subscription_id };
  }

  if (v.draft.valid_from < (existingPrice.valid_from as string)) {
    return {
      success: false,
      error: "La date de début ne peut pas être antérieure au tarif actuel.",
    };
  }

  const sameValidFrom = v.draft.valid_from === existingPrice.valid_from;

  if (sameValidFrom) {
    const { error: updateErr } = await supabase
      .from("tool_subscription_price")
      .update({
        currency: v.draft.currency,
        amount: v.draft.amount_cents,
        valid_to: v.draft.valid_to ?? null,
      })
      .eq("id", input.active_price_id);

    if (updateErr) {
      return {
        success: false,
        error: `Impossible de mettre à jour le tarif : ${updateErr.message}`,
      };
    }
    if (v.draft.currency !== existingPrice.currency) {
      scheduleExchangeRateSyncIfNewCurrency(v.draft.currency);
    }
  } else {
    const closeTo = dayBeforeYmd(v.draft.valid_from);
    if (closeTo < (existingPrice.valid_from as string)) {
      return {
        success: false,
        error:
          "La nouvelle date de début doit permettre de clôturer le tarif précédent.",
      };
    }

    const { error: closeErr } = await supabase
      .from("tool_subscription_price")
      .update({ valid_to: closeTo })
      .eq("id", input.active_price_id);

    if (closeErr) {
      return {
        success: false,
        error: `Impossible de clôturer le tarif : ${closeErr.message}`,
      };
    }

    const { error: insertErr } = await supabase
      .from("tool_subscription_price")
      .insert({
        tool_subscription_id: input.subscription_id,
        currency: v.draft.currency,
        amount: v.draft.amount_cents,
        valid_from: v.draft.valid_from,
        valid_to: v.draft.valid_to ?? null,
      });

    if (insertErr) {
      return {
        success: false,
        error: `Impossible de créer le nouveau tarif : ${insertErr.message}`,
      };
    }
    scheduleExchangeRateSyncIfNewCurrency(v.draft.currency);
  }

  revalidateTool(toolId);
  return { success: true, id: input.subscription_id };
}

export async function deleteToolSubscriptionRecord(
  id: string,
): Promise<DeleteToolSubscriptionResult> {
  const auth = await requireActiveCollaboratorAction();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  if (!isUuid(id.trim())) {
    return { success: false, error: "Identifiant d'abonnement invalide." };
  }

  const supabase = await createClient();

  const { data: existing, error: fetchErr } = await supabase
    .from("tool_subscription")
    .select("id, tool_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr || !existing) {
    return { success: false, error: "Abonnement introuvable." };
  }

  const { error: pricesErr } = await supabase
    .from("tool_subscription_price")
    .delete()
    .eq("tool_subscription_id", id);

  if (pricesErr) {
    return {
      success: false,
      error: `Impossible de supprimer les tarifs : ${pricesErr.message}`,
    };
  }

  const { error } = await supabase
    .from("tool_subscription")
    .delete()
    .eq("id", id);

  if (error) {
    return {
      success: false,
      error: `Impossible de supprimer l'abonnement : ${error.message}`,
    };
  }

  revalidateTool(existing.tool_id as string);
  return { success: true };
}
