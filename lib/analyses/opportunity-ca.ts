import type { OpportunityInvoiceFrequency } from "@/lib/opportunities/types";
import type { OpportunityKanbanStatus } from "@/lib/opportunities/types";

export type CaBucket = "engage" | "previsionnel";

export type OpportunityCaInput = {
  price: number;
  kanban_status: OpportunityKanbanStatus;
  due_date_at: string | null;
  closed_at: string | null;
  end_at: string | null;
  invoice_frequency: OpportunityInvoiceFrequency | null;
};

export type OpportunityCaInstallment = {
  /** Dernier jour du mois d'échéance `YYYY-MM-DD`. */
  ymd: string;
  year: number;
  month: number;
  amount: number;
  bucket: CaBucket;
};

type YmdParts = { year: number; month: number; day: number };

function parseYmd(value: string | null | undefined): YmdParts | null {
  if (!value) return null;
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (!year || !month || !day) return null;
  return { year, month, day };
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function ymdLastDay(year: number, month: number): string {
  const day = lastDayOfMonth(year, month);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function addMonths(year: number, month: number, delta: number): {
  year: number;
  month: number;
} {
  const idx = year * 12 + (month - 1) + delta;
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 };
}

function compareYmd(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Indique si l'opportunité est exclue du CA faute de délais / fréquence
 * (hors `perdue`, déjà hors CA).
 */
export function isMissingBillingSchedule(row: OpportunityCaInput): boolean {
  if (row.kanban_status === "perdue") return false;
  return !row.end_at || !row.invoice_frequency;
}

/**
 * Génère les échéances de facturation pour une opportunité.
 * Retourne `[]` si exclue (perdue, données manquantes, aucune échéance valide).
 */
export function buildOpportunityCaInstallments(
  row: OpportunityCaInput,
): OpportunityCaInstallment[] {
  if (row.kanban_status === "perdue") return [];
  if (!row.end_at || !row.invoice_frequency) return [];

  const price = Number.isFinite(row.price) ? row.price : 0;
  if (price === 0) return [];

  const end = parseYmd(row.end_at);
  if (!end) return [];

  let bucket: CaBucket;
  let start: YmdParts | null;
  if (row.kanban_status === "gagne") {
    bucket = "engage";
    start = parseYmd(row.closed_at);
  } else {
    bucket = "previsionnel";
    start = parseYmd(row.due_date_at);
  }
  if (!start) return [];

  const endYmd = row.end_at.slice(0, 10);
  const months: Array<{ year: number; month: number }> = [];

  if (row.invoice_frequency === "unique") {
    months.push({ year: end.year, month: end.month });
  } else if (row.invoice_frequency === "mensuel") {
    let y = start.year;
    let m = start.month;
    while (y < end.year || (y === end.year && m <= end.month)) {
      months.push({ year: y, month: m });
      const next = addMonths(y, m, 1);
      y = next.year;
      m = next.month;
    }
  } else {
    const step = row.invoice_frequency === "trimestriel" ? 3 : 12;
    let cur = addMonths(start.year, start.month, 1);
    while (true) {
      const dueYmd = ymdLastDay(cur.year, cur.month);
      if (compareYmd(dueYmd, endYmd) > 0) break;
      months.push({ year: cur.year, month: cur.month });
      cur = addMonths(cur.year, cur.month, step);
    }
  }

  if (months.length === 0) return [];

  const amount = price / months.length;
  return months.map(({ year, month }) => ({
    ymd: ymdLastDay(year, month),
    year,
    month,
    amount,
    bucket,
  }));
}
