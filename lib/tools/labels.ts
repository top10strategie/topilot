import type { ToolSubscriptionPlan } from "./types";

const SUBSCRIPTION_PLAN_LABELS: Record<ToolSubscriptionPlan, string> = {
  mensuel: "Mensuel",
  annuel: "Annuel",
};

export function getToolSubscriptionPlanLabel(
  plan: ToolSubscriptionPlan,
): string {
  return SUBSCRIPTION_PLAN_LABELS[plan];
}
