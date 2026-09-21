import { HomeWidgetRenderer } from "@/components/home/home-widget-renderer";
import { emptyAnalysesPayload } from "@/lib/analyses/empty-payload";
import { loadAnalysesPayloadCached } from "@/lib/analyses/queries";
import type { HomeWidgetId } from "@/lib/analyses/types";
import { listHomeMissionsBoard } from "@/lib/missions/queries";
import { listHomeOpportunitiesBoard } from "@/lib/opportunities/queries";

type HomeWidgetSlotProps = {
  widgetId: HomeWidgetId;
  collaboratorId: string;
  role: string;
  /** Empreinte du scope analyses partagée par tous les widgets analytiques. */
  analysesScopeKey: string;
};

export async function HomeWidgetSlot({
  widgetId,
  collaboratorId,
  role,
  analysesScopeKey,
}: HomeWidgetSlotProps) {
  if (widgetId === "kanban_opportunities") {
    const opportunities = await listHomeOpportunitiesBoard(collaboratorId);
    return (
      <HomeWidgetRenderer
        widgetId={widgetId}
        analyses={emptyAnalysesPayload()}
        opportunities={opportunities}
        missions={[]}
        role={role}
      />
    );
  }

  if (widgetId === "kanban_missions") {
    const missions = await listHomeMissionsBoard(collaboratorId);
    return (
      <HomeWidgetRenderer
        widgetId={widgetId}
        analyses={emptyAnalysesPayload()}
        opportunities={[]}
        missions={missions}
        role={role}
      />
    );
  }

  const analyses = await loadAnalysesPayloadCached(analysesScopeKey);
  return (
    <HomeWidgetRenderer
      widgetId={widgetId}
      analyses={analyses}
      opportunities={[]}
      missions={[]}
      role={role}
    />
  );
}
