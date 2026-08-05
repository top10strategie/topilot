"use server";

import { requireManagerOrDirectionAction } from "@/lib/auth/require-action";
import {
  listAuditLogsForPage,
  listAuditLogsForScope,
} from "@/lib/audit/queries";
import type {
  AuditEntityScope,
  AuditHistoryPageFilters,
  AuditLogListItem,
} from "@/lib/audit/types";

export type AuditLogsActionResult =
  | { success: true; logs: AuditLogListItem[] }
  | { success: false; error: string };

/**
 * Historique global (page /history) — réservé Manager / Direction.
 */
export async function fetchAuditLogsForPage(
  filters: AuditHistoryPageFilters = {},
): Promise<AuditLogsActionResult> {
  const auth = await requireManagerOrDirectionAction();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  try {
    const logs = await listAuditLogsForPage(filters);
    return { success: true, logs };
  } catch (error) {
    console.error("fetchAuditLogsForPage:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Impossible de charger l'historique.",
    };
  }
}

/**
 * Historique d'une portée entité (modale) — réservé Manager / Direction.
 */
export async function fetchAuditLogsForScope(
  scope: AuditEntityScope,
): Promise<AuditLogsActionResult> {
  const auth = await requireManagerOrDirectionAction();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  try {
    const logs = await listAuditLogsForScope(scope);
    return { success: true, logs };
  } catch (error) {
    console.error("fetchAuditLogsForScope:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Impossible de charger l'historique.",
    };
  }
}
