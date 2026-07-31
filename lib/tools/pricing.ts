import type { ToolSubscriptionItem, ToolSubscriptionPlan } from "./types";

/**
 * Utilitaires de tarification des outils — adapté de
 * `old_version/lib/tool-subscription/pricing.ts`.
 * Les montants sont stockés et manipulés en **centimes** (colonne
 * `tool_subscription_price.amount`, cf. `04_database_schema.mdc`).
 */

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "€",
  USD: "$",
  GBP: "£",
};

const ISO_4217_PATTERN = /^[A-Z]{3}$/;

export const DEFAULT_SUBSCRIPTION_CURRENCY = "EUR";

export function normalizeCurrency(input: string): string | null {
  const code = input.trim().toUpperCase();
  if (!ISO_4217_PATTERN.test(code)) return null;
  return code;
}

/** Chaîne vide → EUR ; sinon code ISO 4217. */
export function resolveSubscriptionCurrency(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed === "") return DEFAULT_SUBSCRIPTION_CURRENCY;
  return normalizeCurrency(trimmed);
}

export function currencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency.toUpperCase()] ?? currency.toUpperCase();
}

/** Parse une saisie (€, virgule ou point) → centimes entiers. */
export function eurosToCents(input: string): number | null {
  const trimmed = input.trim().replace(/\s/g, "");
  if (!trimmed) return null;
  const normalized = trimmed.replace(",", ".");
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return null;
  const value = Number.parseFloat(normalized);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

export function centsToEuroInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

export function isPriceActive(validTo: string | null): boolean {
  return validTo == null || validTo === "";
}

/** Coût mensuel proratisé : montant tel quel si mensuel, /12 si annuel. */
export function monthlyCentsFromPrice(
  amountCents: number,
  plan: ToolSubscriptionPlan,
): number {
  if (plan === "mensuel") {
    return amountCents;
  }
  return Math.round(amountCents / 12);
}

export function planPeriodSuffix(plan: ToolSubscriptionPlan): string {
  return plan === "annuel" ? "/an" : "/mois";
}

export function formatCentsWithCurrency(
  cents: number,
  currency: string,
): string {
  const code = currency.toUpperCase();
  try {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(cents / 100);
  } catch {
    const amount = cents / 100;
    const formatted = new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
    return `${formatted} ${currencySymbol(code)}`;
  }
}

export function formatMonthlyAmount(cents: number, currency: string): string {
  return `${formatCentsWithCurrency(cents, currency)}/mois`;
}

/** Libellé d'une ligne de prix (ex. « Année 2024 »). */
export function formatPricePeriodLabel(validFrom: string): string {
  const year = validFrom.slice(0, 4);
  if (/^\d{4}$/.test(year)) return `Année ${year}`;
  return validFrom;
}

export function todayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Jour précédent une date yyyy-MM-dd. */
export function dayBeforeYmd(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(y!, m! - 1, d!);
  date.setDate(date.getDate() - 1);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export type ToolMonthlyBadge =
  | { kind: "none" }
  | { kind: "perime" }
  | { kind: "amount"; monthly_cents: number; currency: string }
  | { kind: "symbols"; symbols: string[] };

/**
 * Calcule le badge "coût mensuel actif" d'un outil à partir de ses
 * abonnements (`tool_subscription` + `tool_subscription_price`).
 */
export function computeToolMonthlyBadge(
  subscriptions: ToolSubscriptionItem[],
): ToolMonthlyBadge {
  if (subscriptions.length === 0) {
    return { kind: "none" };
  }

  const activePrices = subscriptions.flatMap((subscription) =>
    subscription.prices
      .filter((price) => isPriceActive(price.valid_to))
      .map((price) => ({
        ...price,
        subscription_plan: subscription.subscription_plan,
      })),
  );

  if (activePrices.length === 0) {
    return { kind: "perime" };
  }

  const currencies = [
    ...new Set(activePrices.map((price) => price.currency.toUpperCase())),
  ];

  if (currencies.length > 1) {
    return { kind: "symbols", symbols: currencies.map(currencySymbol) };
  }

  const currency = currencies[0]!;
  const total = activePrices.reduce(
    (sum, price) =>
      sum + monthlyCentsFromPrice(price.amount_cents, price.subscription_plan),
    0,
  );

  if (total <= 0) {
    return { kind: "none" };
  }

  return { kind: "amount", monthly_cents: total, currency };
}

export function formatToolMonthlyBadge(badge: ToolMonthlyBadge): string | null {
  switch (badge.kind) {
    case "none":
      return null;
    case "perime":
      return "Périmé";
    case "amount":
      return formatMonthlyAmount(badge.monthly_cents, badge.currency);
    case "symbols":
      return badge.symbols.join(" ");
  }
}

/** Utilisé par le filtre "Avec abonnement / Sans abonnement". */
export function hasActiveSubscriptionCost(badge: ToolMonthlyBadge): boolean {
  return badge.kind === "amount" || badge.kind === "symbols";
}

/** Valeur en euros utilisable pour le filtre par tranche de coût (devise unique uniquement). */
export function monthlyCostEuros(badge: ToolMonthlyBadge): number | null {
  return badge.kind === "amount" ? badge.monthly_cents / 100 : null;
}
