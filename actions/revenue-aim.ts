"use server";

import { revalidatePath } from "next/cache";
import { requireManagerOrDirectionAction } from "@/lib/auth/require-action";
import { createClient } from "@/lib/supabase/server";

export type RevenueAimInput = {
  year: string;
  amount: string;
};

export type RevenueAimActionResult =
  | { success: true; id: string; year: number; amount: number }
  | {
      success: false;
      error: string;
      fieldErrors?: Partial<Record<"year" | "amount", string>>;
    };

export type DeleteRevenueAimResult =
  | { success: true }
  | { success: false; error: string };

function revalidateRevenueAimPaths() {
  revalidatePath("/analyses");
  revalidatePath("/");
}

function normalizeRevenueAimInput(input: RevenueAimInput): {
  year: number;
  amount: number;
  fieldErrors: Partial<Record<"year" | "amount", string>>;
} {
  const fieldErrors: Partial<Record<"year" | "amount", string>> = {};

  const yearRaw = input.year.trim();
  const year = Number(yearRaw);
  if (!yearRaw || !Number.isInteger(year)) {
    fieldErrors.year = "L'année est obligatoire (nombre entier).";
  } else if (year < 2000 || year > 2100) {
    fieldErrors.year = "L'année doit être comprise entre 2000 et 2100.";
  }

  const amountRaw = input.amount.trim().replace(",", ".");
  const amount = Number(amountRaw);
  if (!amountRaw || !Number.isFinite(amount)) {
    fieldErrors.amount = "Le montant est obligatoire.";
  } else if (amount < 0) {
    fieldErrors.amount = "Le montant ne peut pas être négatif.";
  }

  return {
    year: Number.isInteger(year) ? year : NaN,
    amount: Number.isFinite(amount) ? amount : NaN,
    fieldErrors,
  };
}

export async function createRevenueAim(
  input: RevenueAimInput,
): Promise<RevenueAimActionResult> {
  const auth = await requireManagerOrDirectionAction();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  const { year, amount, fieldErrors } = normalizeRevenueAimInput(input);
  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      error: "Corrigez les erreurs du formulaire.",
      fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("revenue_aim")
    .insert({ year, amount })
    .select("id, year, amount")
    .single();

  if (error) {
    if (error.code === "23505") {
      return {
        success: false,
        error: "Un objectif existe déjà pour cette année.",
        fieldErrors: { year: "Cette année a déjà un objectif." },
      };
    }
    console.error("createRevenueAim:", error);
    return {
      success: false,
      error: `Impossible de créer l'objectif : ${error.message}`,
    };
  }

  revalidateRevenueAimPaths();
  return {
    success: true,
    id: data.id,
    year: data.year,
    amount: Number(data.amount),
  };
}

export async function updateRevenueAim(
  id: string,
  input: RevenueAimInput,
): Promise<RevenueAimActionResult> {
  const auth = await requireManagerOrDirectionAction();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  if (!id) {
    return { success: false, error: "Identifiant d'objectif manquant." };
  }

  const { year, amount, fieldErrors } = normalizeRevenueAimInput(input);
  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      error: "Corrigez les erreurs du formulaire.",
      fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("revenue_aim")
    .update({ year, amount })
    .eq("id", id)
    .select("id, year, amount")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return {
        success: false,
        error: "Un objectif existe déjà pour cette année.",
        fieldErrors: { year: "Cette année a déjà un objectif." },
      };
    }
    console.error("updateRevenueAim:", error);
    return {
      success: false,
      error: `Impossible de mettre à jour l'objectif : ${error.message}`,
    };
  }

  if (!data) {
    return { success: false, error: "Objectif introuvable." };
  }

  revalidateRevenueAimPaths();
  return {
    success: true,
    id: data.id,
    year: data.year,
    amount: Number(data.amount),
  };
}

export async function deleteRevenueAim(
  id: string,
): Promise<DeleteRevenueAimResult> {
  const auth = await requireManagerOrDirectionAction();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  if (!id) {
    return { success: false, error: "Identifiant d'objectif manquant." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("revenue_aim").delete().eq("id", id);

  if (error) {
    console.error("deleteRevenueAim:", error);
    return {
      success: false,
      error: `Impossible de supprimer l'objectif : ${error.message}`,
    };
  }

  revalidateRevenueAimPaths();
  return { success: true };
}
