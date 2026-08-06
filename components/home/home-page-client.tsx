"use client";

import { useState } from "react";
import { GearSix } from "@phosphor-icons/react";
import { HomeWidgetRenderer } from "@/components/home/home-widget-renderer";
import { HomeWidgetsDialog } from "@/components/home/home-widgets-dialog";
import { IconActionButton } from "@/components/layout/icon-action-button";
import { PageHero } from "@/components/layout/page-hero";
import type { AnalysesPayload, HomeWidgetId } from "@/lib/analyses/types";
import {
  isCollaboratorHomeWidgetId,
  isHomeWidgetId,
} from "@/lib/analyses/types";
import type { MissionListItem } from "@/lib/missions/types";
import type { OpportunityListItem } from "@/lib/opportunities/types";

type HomePageClientProps = {
  analyses: AnalysesPayload;
  opportunities: OpportunityListItem[];
  missions: MissionListItem[];
  initialWidgets: string[];
  role: string;
};

function filterWidgetsForRole(
  widgets: string[],
  role: string,
): HomeWidgetId[] {
  const normalized = widgets.map((id) =>
    id === "opp_by_category" ? "opp_ca_by_category" : id,
  );
  if (role === "collaborator") {
    return normalized.filter(isCollaboratorHomeWidgetId);
  }
  return normalized.filter(isHomeWidgetId);
}

export function HomePageClient({
  analyses,
  opportunities,
  missions,
  initialWidgets,
  role,
}: HomePageClientProps) {
  const [widgets, setWidgets] = useState<HomeWidgetId[]>(() =>
    filterWidgetsForRole(initialWidgets, role),
  );
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHero
        title="Accueil"
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
                role={role}
              />
            ))}
          </div>
        )}
      </div>
      <HomeWidgetsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialSelected={widgets}
        onSaved={(selected) =>
          setWidgets(filterWidgetsForRole(selected, role))
        }
        role={role}
      />
    </div>
  );
}
