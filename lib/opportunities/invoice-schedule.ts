import { formOptional } from "@/lib/form-data";
import type { OpportunityInvoiceScheduleItem } from "@/lib/opportunities/types";

export type ParsedInvoiceSchedule =
  | { ok: true; rows: OpportunityInvoiceScheduleItem[] }
  | { ok: false; error: string };

export function parseInvoiceScheduleFormData(
  formData: FormData,
): ParsedInvoiceSchedule {
  const raw = formOptional(formData, "invoice_schedule");
  if (!raw) {
    return { ok: true, rows: [] };
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return { ok: false, error: "Échéancier invalide." };
    }
    const rows: OpportunityInvoiceScheduleItem[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") {
        return { ok: false, error: "Échéancier invalide." };
      }
      const record = item as Record<string, unknown>;
      const invoice_at =
        typeof record.invoice_at === "string" ? record.invoice_at.trim() : "";
      const amountRaw = record.amount;
      const amount =
        typeof amountRaw === "number"
          ? amountRaw
          : typeof amountRaw === "string"
            ? Number(String(amountRaw).replace(",", "."))
            : NaN;
      if (!invoice_at) {
        return { ok: false, error: "Chaque échelon doit avoir une date." };
      }
      if (!Number.isFinite(amount) || amount <= 0) {
        return {
          ok: false,
          error: "Chaque échelon doit avoir un montant strictement positif.",
        };
      }
      rows.push({ invoice_at, amount });
    }
    return { ok: true, rows };
  } catch {
    return { ok: false, error: "Échéancier invalide." };
  }
}

export function validateEchellonneSchedule(
  rows: OpportunityInvoiceScheduleItem[],
  price: number | null | undefined,
): string | null {
  if (price == null || !Number.isFinite(price)) {
    return "Le montant est obligatoire pour une facturation échelonnée.";
  }
  if (rows.length < 2) {
    return "Une facturation échelonnée requiert au moins 2 échéances.";
  }
  if (rows.length > 12) {
    return "Une facturation échelonnée autorise au maximum 12 échéances.";
  }
  const months = new Set<string>();
  for (const row of rows) {
    const monthKey = row.invoice_at.slice(0, 7);
    if (months.has(monthKey)) {
      return "Une seule échéance est autorisée par mois calendaire.";
    }
    months.add(monthKey);
  }
  const sum = rows.reduce((acc, row) => acc + row.amount, 0);
  if (Math.round(sum * 100) !== Math.round(price * 100)) {
    return "La somme des échelons doit égaler exactement le montant de l'opportunité.";
  }
  return null;
}
