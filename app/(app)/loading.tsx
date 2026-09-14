import { PageHero } from "@/components/layout/page-hero";
import { Skeleton } from "@/components/ui/skeleton";

/** Fallback instantané de navigation App Router (shell déjà monté). */
export default function AppLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHero title="Chargement…" />
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
