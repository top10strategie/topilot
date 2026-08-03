"use client";

import { MissionsAnalysisPanel } from "@/components/analyses/missions-analysis-panel";
import { OpportunitiesAnalysisPanel } from "@/components/analyses/opportunities-analysis-panel";
import { SubscriptionsAnalysisPanel } from "@/components/analyses/subscriptions-analysis-panel";
import { PageHero } from "@/components/layout/page-hero";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AnalysesPayload } from "@/lib/analyses/types";

type AnalysesPageClientProps = {
  data: AnalysesPayload;
};

export function AnalysesPageClient({ data }: AnalysesPageClientProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHero title="Études et analyses" />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6">
        <Tabs defaultValue="opportunities">
          <TabsList variant="line" className="mb-4 w-full justify-start">
            <TabsTrigger value="opportunities">Opportunités</TabsTrigger>
            <TabsTrigger value="missions">Missions</TabsTrigger>
            <TabsTrigger value="subscriptions">Abonnements</TabsTrigger>
          </TabsList>
          <TabsContent value="opportunities" className="mt-0">
            <OpportunitiesAnalysisPanel data={data.opportunities} />
          </TabsContent>
          <TabsContent value="missions" className="mt-0">
            <MissionsAnalysisPanel data={data.missions} />
          </TabsContent>
          <TabsContent value="subscriptions" className="mt-0">
            <SubscriptionsAnalysisPanel data={data.subscriptions} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
