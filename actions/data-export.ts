"use server";

import { requireManagerOrDirectionAction } from "@/lib/auth/require-action";
import { loadAnalysesPayload } from "@/lib/analyses/queries";
import { rowsToCsv } from "@/lib/data-admin/csv";
import {
  getOpportunityInvoiceFrequencyLabel,
  getOpportunityKanbanStatusLabel,
  getOpportunityPriorityLabel,
} from "@/lib/opportunities/labels";
import type {
  OpportunityInvoiceFrequency,
  OpportunityKanbanStatus,
  OpportunityPriority,
} from "@/lib/opportunities/types";
import {
  getMissionKanbanStatusLabel,
  getMissionScopeLabel,
} from "@/lib/missions/labels";
import type { MissionKanbanStatus, MissionScope } from "@/lib/missions/types";
import { createClient } from "@/lib/supabase/server";
import { looseClient } from "@/lib/supabase/loose";

export type DataExportResult =
  | { success: true; csv: string; filename: string }
  | { success: false; error: string };

function parseIsoDate(value: string): string | null {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const d = new Date(`${trimmed}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return trimmed;
}

function validateRange(
  from: string,
  to: string,
): { from: string; to: string } | { error: string } {
  const f = parseIsoDate(from);
  const t = parseIsoDate(to);
  if (!f || !t) {
    return { error: "Dates invalides (format attendu : AAAA-MM-JJ)." };
  }
  if (f > t) {
    return { error: "La date de début doit être antérieure à la date de fin." };
  }
  return { from: f, to: t };
}

function yearsInRange(from: string, to: string): number[] {
  const y0 = Number(from.slice(0, 4));
  const y1 = Number(to.slice(0, 4));
  const years: number[] = [];
  for (let y = y0; y <= y1; y++) years.push(y);
  return years;
}

function monthInRange(
  year: number,
  month: number,
  from: string,
  to: string,
): boolean {
  const key = `${year}-${String(month).padStart(2, "0")}`;
  const fromKey = from.slice(0, 7);
  const toKey = to.slice(0, 7);
  return key >= fromKey && key <= toKey;
}

export async function exportOpportunitiesCsv(
  fromRaw: string,
  toRaw: string,
): Promise<DataExportResult> {
  const auth = await requireManagerOrDirectionAction();
  if (!auth.success) return { success: false, error: auth.error };

  const range = validateRange(fromRaw, toRaw);
  if ("error" in range) return { success: false, error: range.error };

  const supabase = looseClient(await createClient());

  const { data: rows, error } = await supabase
    .from("opportunity")
    .select(
      `
      id,
      opportunity_name,
      price,
      probability_confirmation,
      average_price,
      entry_average_price,
      kanban_status,
      is_active,
      priority,
      due_date_at,
      end_at,
      closed_at,
      invoice_frequency,
      action,
      source,
      notes,
      last_meeting_at,
      created_at,
      client:client_id ( client_name ),
      contact_client:contact_client_id ( first_name, last_name ),
      collaborator:collaborator_id ( first_name, last_name ),
      opportunity_category (
        category:category_business!category_id ( label )
      ),
      invoice_schedule ( invoice_at )
    `,
    )
    .order("closed_at", { ascending: false, nullsFirst: false });

  if (error) {
    console.error("exportOpportunitiesCsv:", error);
    return { success: false, error: error.message };
  }

  type Row = {
    id: string;
    opportunity_name: string;
    price: number | null;
    probability_confirmation: number;
    average_price: number | null;
    entry_average_price: number | null;
    kanban_status: OpportunityKanbanStatus;
    is_active: boolean;
    priority: OpportunityPriority;
    due_date_at: string | null;
    end_at: string | null;
    closed_at: string | null;
    invoice_frequency: OpportunityInvoiceFrequency | null;
    action: string | null;
    source: string | null;
    notes: string | null;
    last_meeting_at: string | null;
    created_at: string;
    client: { client_name: string } | null;
    contact_client: { first_name: string; last_name: string } | null;
    collaborator: { first_name: string; last_name: string } | null;
    opportunity_category: Array<{ category: { label: string } | null }> | null;
    invoice_schedule: Array<{ invoice_at: string }> | null;
  };

  const filtered = ((rows ?? []) as unknown as Row[]).filter((row) => {
    const { from, to } = range;
    if (row.closed_at && row.closed_at >= from && row.closed_at <= to) return true;
    if (row.end_at && row.end_at >= from && row.end_at <= to) return true;
    return (row.invoice_schedule ?? []).some(
      (s) => s.invoice_at >= from && s.invoice_at <= to,
    );
  });

  const headers = [
    "id",
    "titre",
    "client",
    "contact",
    "responsable",
    "statut",
    "actif",
    "priorite",
    "montant",
    "probabilite",
    "montant_pondere",
    "montant_pondere_entree",
    "echeance",
    "debut_facturation",
    "fin_facturation",
    "frequence_facturation",
    "categories",
    "action",
    "source",
    "notes",
    "derniere_rencontre",
    "cree_le",
  ];

  const csvRows = filtered.map((row) => {
    const contact = row.contact_client
      ? `${row.contact_client.first_name} ${row.contact_client.last_name}`
      : "";
    const responsible = row.collaborator
      ? `${row.collaborator.first_name} ${row.collaborator.last_name}`
      : "";
    const categories = (row.opportunity_category ?? [])
      .map((l) => l.category?.label)
      .filter(Boolean)
      .join(" | ");
    return [
      row.id,
      row.opportunity_name,
      row.client?.client_name ?? "",
      contact,
      responsible,
      getOpportunityKanbanStatusLabel(row.kanban_status),
      row.is_active ? "oui" : "non",
      getOpportunityPriorityLabel(row.priority),
      row.price,
      row.probability_confirmation,
      row.average_price,
      row.entry_average_price,
      row.due_date_at,
      row.closed_at,
      row.end_at,
      row.invoice_frequency
        ? getOpportunityInvoiceFrequencyLabel(row.invoice_frequency)
        : "",
      categories,
      row.action,
      row.source,
      row.notes,
      row.last_meeting_at,
      row.created_at,
    ];
  });

  return {
    success: true,
    csv: rowsToCsv(headers, csvRows),
    filename: `opportunites_${range.from}_${range.to}.csv`,
  };
}

export async function exportMissionsCsv(
  fromRaw: string,
  toRaw: string,
): Promise<DataExportResult> {
  const auth = await requireManagerOrDirectionAction();
  if (!auth.success) return { success: false, error: auth.error };

  const range = validateRange(fromRaw, toRaw);
  if ("error" in range) return { success: false, error: range.error };

  const supabase = looseClient(await createClient());

  const { data: rows, error } = await supabase
    .from("mission")
    .select(
      `
      id,
      mission_name,
      mission_scope,
      kanban_status,
      estimated_charge,
      start_at,
      end_at,
      archived_at,
      completed_at,
      notes,
      created_at,
      client:client_id ( client_name ),
      opportunity:opportunity_id ( opportunity_name ),
      collaborator:collaborator_id ( first_name, last_name ),
      mission_category (
        category:category_business!category_id ( label )
      )
    `,
    )
    .not("end_at", "is", null)
    .gte("end_at", range.from)
    .lte("end_at", range.to)
    .order("end_at", { ascending: false });

  if (error) {
    console.error("exportMissionsCsv:", error);
    return { success: false, error: error.message };
  }

  type Row = {
    id: string;
    mission_name: string;
    mission_scope: MissionScope;
    kanban_status: MissionKanbanStatus;
    estimated_charge: number | null;
    start_at: string;
    end_at: string | null;
    archived_at: string | null;
    completed_at: string | null;
    notes: string | null;
    created_at: string;
    client: { client_name: string } | null;
    opportunity: { opportunity_name: string } | null;
    collaborator: { first_name: string; last_name: string } | null;
    mission_category: Array<{ category: { label: string } | null }> | null;
  };

  const headers = [
    "id",
    "titre",
    "scope",
    "client",
    "opportunite",
    "responsable",
    "statut",
    "temps_vendu",
    "debut",
    "fin",
    "complete_le",
    "archive_le",
    "categories",
    "notes",
    "cree_le",
  ];

  const csvRows = ((rows ?? []) as unknown as Row[]).map((row) => {
    const responsible = row.collaborator
      ? `${row.collaborator.first_name} ${row.collaborator.last_name}`
      : "";
    const categories = (row.mission_category ?? [])
      .map((l) => l.category?.label)
      .filter(Boolean)
      .join(" | ");
    return [
      row.id,
      row.mission_name,
      getMissionScopeLabel(row.mission_scope),
      row.client?.client_name ?? "",
      row.opportunity?.opportunity_name ?? "",
      responsible,
      getMissionKanbanStatusLabel(row.kanban_status),
      row.estimated_charge,
      row.start_at,
      row.end_at,
      row.completed_at,
      row.archived_at,
      categories,
      row.notes,
      row.created_at,
    ];
  });

  return {
    success: true,
    csv: rowsToCsv(headers, csvRows),
    filename: `missions_${range.from}_${range.to}.csv`,
  };
}

/**
 * Un seul CSV agrégé : pipeline, CA client, CA pôle (logique analyses / CA).
 */
export async function exportAnalysesOpportunitiesCsv(
  fromRaw: string,
  toRaw: string,
): Promise<DataExportResult> {
  const auth = await requireManagerOrDirectionAction();
  if (!auth.success) return { success: false, error: auth.error };

  const range = validateRange(fromRaw, toRaw);
  if ("error" in range) return { success: false, error: range.error };

  const payload = await loadAnalysesPayload({
    opportunities: true,
    missions: false,
    subscriptions: false,
  });
  const opp = payload.opportunities;
  const years = yearsInRange(range.from, range.to);
  const clientLabel = new Map(
    opp.caClientOptions.map((c) => [c.id, c.label] as const),
  );

  const headers = [
    "section",
    "annee",
    "mois",
    "label_mois",
    "client_ou_pole",
    "engage",
    "previsionnel",
    "total",
    "objectif_ca",
  ];
  const csvRows: Array<Array<string | number | null>> = [];

  for (const year of years) {
    const pipeline = opp.pipelineByYear[year] ?? [];
    const aim = opp.revenueAimsByYear[year] ?? null;
    for (const point of pipeline) {
      if (!monthInRange(year, point.month, range.from, range.to)) continue;
      csvRows.push([
        "pipeline",
        year,
        point.month,
        point.label,
        "",
        point.engage,
        point.previsionnel,
        point.engage + point.previsionnel,
        aim,
      ]);
    }

    const byClient = opp.caByClientByYear[year] ?? {};
    for (const [clientId, series] of Object.entries(byClient)) {
      for (const point of series.months) {
        if (!monthInRange(year, point.month, range.from, range.to)) continue;
        csvRows.push([
          "ca_client",
          year,
          point.month,
          point.label,
          clientLabel.get(clientId) ?? clientId,
          point.engage,
          point.previsionnel,
          point.engage + point.previsionnel,
          null,
        ]);
      }
    }

    const byTeam = opp.caByTeamByYear[year] ?? [];
    for (const team of byTeam) {
      csvRows.push([
        "ca_pole",
        year,
        null,
        "",
        team.label,
        team.engage,
        team.previsionnel,
        team.engage + team.previsionnel,
        null,
      ]);
    }
  }

  return {
    success: true,
    csv: rowsToCsv(headers, csvRows),
    filename: `analyses_opportunites_${range.from}_${range.to}.csv`,
  };
}
