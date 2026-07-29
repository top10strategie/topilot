import { EntityDetailPlaceholder } from "@/components/layout/entity-detail-placeholder";

type Props = {
  params: Promise<{ id: string }>;
};

export default function ToolDetailPage({ params }: Props) {
  return <EntityDetailPlaceholder title="Fiche outil" params={params} />;
}
