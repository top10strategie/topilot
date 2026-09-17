import { createClient } from "@/lib/supabase/server";
import type { RevenueAimItem } from "./types";

function parseAmount(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Objectifs de CA annuels, triés par année décroissante.
 */
export async function listRevenueAims(): Promise<RevenueAimItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("revenue_aim")
    .select("id, amount, year")
    .order("year", { ascending: false });

  if (error) {
    console.error("listRevenueAims:", error);
    throw new Error(
      `Impossible de charger les objectifs de CA : ${error.message}`,
    );
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    year: row.year,
    amount: parseAmount(row.amount),
  }));
}
