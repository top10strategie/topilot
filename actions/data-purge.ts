"use server";

import { cookies } from "next/headers";
import { requireManagerOrDirectionAction } from "@/lib/auth/require-action";
import {
  isPurgeYearEligible,
  maxPurgeableYear,
  PURGE_REAUTH_COOKIE,
  type PurgeYearResult,
} from "@/lib/data-admin/purge";
import {
  createPurgeReauthCookieValue,
  PURGE_REAUTH_TTL_SECONDS,
  verifyPurgeReauthCookieValue,
} from "@/lib/data-admin/purge-reauth";
import { createClient } from "@/lib/supabase/server";

export type DataPurgeActionResult =
  | { success: true; data: PurgeYearResult }
  | { success: false; error: string };

export type PurgeReauthResult =
  | { success: true }
  | { success: false; error: string; fieldErrors?: { password?: string } };

async function hasValidPurgeReauth(
  collaboratorId: string,
): Promise<boolean> {
  const jar = await cookies();
  return verifyPurgeReauthCookieValue(
    jar.get(PURGE_REAUTH_COOKIE)?.value,
    collaboratorId,
  );
}

export async function checkPurgeReauthStatus(): Promise<{ reauthenticated: boolean }> {
  const auth = await requireManagerOrDirectionAction();
  if (!auth.success) return { reauthenticated: false };
  return { reauthenticated: await hasValidPurgeReauth(auth.collaborator.id) };
}

/**
 * Re-saisie du mot de passe ; pose un cookie de session (sans Max-Age).
 */
export async function reauthForPurge(password: string): Promise<PurgeReauthResult> {
  const auth = await requireManagerOrDirectionAction();
  if (!auth.success) return { success: false, error: auth.error };

  const trimmed = password.trim();
  if (!trimmed) {
    return {
      success: false,
      error: "Mot de passe requis.",
      fieldErrors: { password: "Mot de passe requis." },
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user?.email) {
    return { success: false, error: "Impossible de vérifier l'identité." };
  }

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: trimmed,
  });
  if (reauthError) {
    return {
      success: false,
      error: "Mot de passe incorrect.",
      fieldErrors: { password: "Mot de passe incorrect." },
    };
  }

  const jar = await cookies();
  jar.set(PURGE_REAUTH_COOKIE, createPurgeReauthCookieValue(auth.collaborator.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PURGE_REAUTH_TTL_SECONDS,
  });

  return { success: true };
}

export async function previewPurgeYear(year: number): Promise<DataPurgeActionResult> {
  const auth = await requireManagerOrDirectionAction();
  if (!auth.success) return { success: false, error: auth.error };

  if (!(await hasValidPurgeReauth(auth.collaborator.id))) {
    return {
      success: false,
      error: "Veuillez ressaisir votre mot de passe avant la purge.",
    };
  }

  if (!isPurgeYearEligible(year)) {
    return {
      success: false,
      error: `Année non éligible. Maximum autorisé : ${maxPurgeableYear()}.`,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("purge_year_data", {
    p_year: year,
    p_dry_run: true,
  });

  if (error) {
    console.error("previewPurgeYear:", error);
    return { success: false, error: error.message };
  }

  return { success: true, data: data as PurgeYearResult };
}

export async function executePurgeYear(year: number): Promise<DataPurgeActionResult> {
  const auth = await requireManagerOrDirectionAction();
  if (!auth.success) return { success: false, error: auth.error };

  if (!(await hasValidPurgeReauth(auth.collaborator.id))) {
    return {
      success: false,
      error: "Veuillez ressaisir votre mot de passe avant la purge.",
    };
  }

  if (!isPurgeYearEligible(year)) {
    return {
      success: false,
      error: `Année non éligible. Maximum autorisé : ${maxPurgeableYear()}.`,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("purge_year_data", {
    p_year: year,
    p_dry_run: false,
  });

  if (error) {
    console.error("executePurgeYear:", error);
    return { success: false, error: error.message };
  }

  return { success: true, data: data as PurgeYearResult };
}
