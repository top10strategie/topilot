import { EntityDetailPlaceholder } from "@/components/layout/entity-detail-placeholder";

type Props = {
  params: Promise<{ id: string }>;
};

export default function OpportunityDetailPage({ params }: Props) {
  return <EntityDetailPlaceholder title="Fiche opportunité" params={params} />;
}
