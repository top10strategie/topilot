import { describe, expect, it } from "vitest";
import {
  computeToolMonthlyBadge,
  eurosToCents,
  monthlyCentsFromPrice,
  resolveSubscriptionCurrency,
} from "@/lib/tools/pricing";
import type { ToolSubscriptionItem } from "@/lib/tools/types";

describe("eurosToCents", () => {
  it("parse une saisie avec virgule", () => {
    expect(eurosToCents("12,50")).toBe(1250);
    expect(eurosToCents("0,01")).toBe(1);
  });

  it("refuse une saisie vide ou invalide", () => {
    expect(eurosToCents("")).toBeNull();
    expect(eurosToCents("-1")).toBeNull();
    expect(eurosToCents("12.345")).toBeNull();
  });
});

describe("monthlyCentsFromPrice", () => {
  it("laisse le mensuel tel quel et divise l'annuel par 12", () => {
    expect(monthlyCentsFromPrice(1200, "mensuel")).toBe(1200);
    expect(monthlyCentsFromPrice(1200, "annuel")).toBe(100);
  });
});

describe("resolveSubscriptionCurrency", () => {
  it("retombe sur EUR si vide et normalise un code ISO", () => {
    expect(resolveSubscriptionCurrency("")).toBe("EUR");
    expect(resolveSubscriptionCurrency(" usd ")).toBe("USD");
    expect(resolveSubscriptionCurrency("EURO")).toBeNull();
  });
});

describe("computeToolMonthlyBadge", () => {
  it("somme les prix mensuels actifs d'une même devise", () => {
    const subscriptions: ToolSubscriptionItem[] = [
      {
        id: "sub-1",
        title: "Plan",
        subscription_plan: "annuel",
        prices: [
          {
            id: "p1",
            currency: "EUR",
            amount_cents: 12000,
            valid_from: "2026-01-01",
            valid_to: null,
          },
        ],
      },
    ];
    expect(computeToolMonthlyBadge(subscriptions)).toEqual({
      kind: "amount",
      monthly_cents: 1000,
      currency: "EUR",
    });
  });

  it("signale un abonnement périmé", () => {
    const subscriptions: ToolSubscriptionItem[] = [
      {
        id: "sub-1",
        title: "Plan",
        subscription_plan: "mensuel",
        prices: [
          {
            id: "p1",
            currency: "EUR",
            amount_cents: 990,
            valid_from: "2025-01-01",
            valid_to: "2025-12-31",
          },
        ],
      },
    ];
    expect(computeToolMonthlyBadge(subscriptions)).toEqual({ kind: "perime" });
  });
});
