"use client";

import { useState } from "react";
import { GearSix } from "@phosphor-icons/react";
import { HomeWidgetRenderer } from "@/components/home/home-widget-renderer";
import { HomeWidgetsDialog } from "@/components/home/home-widgets-dialog";
import { IconActionButton } from "@/components/layout/icon-action-button";
import { PageHero } from "@/components/layout/page-hero";
import type { AnalysesPayload, HomeWidgetId } from "@/lib/analyses/types";
import { isHomeWidgetId } from "@/lib/analyses/types";
import type { MissionListItem } from "@/lib/missions/types";
import type { OpportunityListItem } from "@/lib/opportunities/types";

type HomePageClientProps = {
  analyses: AnalysesPayload;
  opportunities: OpportunityListItem[];
  missions: MissionListItem[];
  initialWidgets: string[];
};

export function HomePageClient({
  analyses,
  opportunities,
  missions,
  initialWidgets,
}: HomePageClientProps) {
  const [widgets, setWidgets] = useState<HomeWidgetId[]>(
    initialWidgets.filter(isHomeWidgetId),
  );
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHero
        title="Home"
        actions={
          <IconActionButton
            label="Configurer les widgets"
            onClick={() => setDialogOpen(true)}
          >
            <GearSix className="size-4" />
          </IconActionButton>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6">
        {widgets.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun widget sélectionné. Utilisez l&apos;icône d&apos;engrenage pour
            personnaliser votre page d&apos;accueil.
          </p>
        ) : (
          <div className="space-y-8">
            {widgets.map((id) => (
              <HomeWidgetRenderer
                key={id}
                widgetId={id}
                analyses={analyses}
                opportunities={opportunities}
                missions={missions}
              />
            ))}
          </div>
        )}
      </div>
      <HomeWidgetsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialSelected={widgets}
        onSaved={setWidgets}
      />
    </div>
  );
}
