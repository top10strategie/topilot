import { EntityDetailPlaceholder } from "@/components/layout/entity-detail-placeholder";

type Props = {
  params: Promise<{ id: string }>;
};

export default function ClientDetailPage({ params }: Props) {
  return <EntityDetailPlaceholder title="Fiche client" params={params} />;
}
