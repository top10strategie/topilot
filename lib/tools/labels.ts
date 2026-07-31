import type { ToolSubscriptionPlan } from "./types";

export const TOOL_SUBSCRIPTION_PLANS: ToolSubscriptionPlan[] = [
  "mensuel",
  "annuel",
];

const SUBSCRIPTION_PLAN_LABELS: Record<ToolSubscriptionPlan, string> = {
  mensuel: "Mensuel",
  annuel: "Annuel",
};

export function getToolSubscriptionPlanLabel(
  plan: ToolSubscriptionPlan,
): string {
  return SUBSCRIPTION_PLAN_LABELS[plan];
}

export function formatToolDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}
