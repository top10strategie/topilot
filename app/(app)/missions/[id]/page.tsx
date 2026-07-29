import { EntityDetailPlaceholder } from "@/components/layout/entity-detail-placeholder";

type Props = {
  params: Promise<{ id: string }>;
};

export default function MissionDetailPage({ params }: Props) {
  return <EntityDetailPlaceholder title="Fiche mission" params={params} />;
}
