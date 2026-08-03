import { Suspense } from "react";
import { PageHero } from "@/components/layout/page-hero";
import { WikisPageClient } from "@/components/wiki/wikis-page-client";
import { Skeleton } from "@/components/ui/skeleton";
import { listCategories } from "@/lib/categories/queries";
import { listWikis } from "@/lib/wiki/queries";

async function WikisContent() {
  const [wikis, categories] = await Promise.all([
    listWikis(),
    listCategories(),
  ]);

  return <WikisPageClient wikis={wikis} categories={categories} />;
}

function WikisFallback() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHero title="Wikis" />
      <div className="space-y-4 px-4 py-4 md:px-6">
        <Skeleton className="h-9 w-80" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-36 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function WikisPage() {
  return (
    <Suspense fallback={<WikisFallback />}>
      <WikisContent />
    </Suspense>
  );
}
