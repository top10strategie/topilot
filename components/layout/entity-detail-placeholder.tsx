import { PageHero } from "@/components/layout/page-hero";
import { Suspense } from "react";

async function DetailBody({
  title,
  params,
}: {
  title: string;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHero title={title} />
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-6">
        <p className="text-sm text-muted-foreground">À venir — {id}</p>
      </div>
    </div>
  );
}

function DetailFallback({ title }: { title: string }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHero title={title} />
      <div className="flex-1 px-4 py-6 md:px-6">
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </div>
    </div>
  );
}

export function EntityDetailPlaceholder({
  title,
  params,
}: {
  title: string;
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<DetailFallback title={title} />}>
      <DetailBody title={title} params={params} />
    </Suspense>
  );
}
