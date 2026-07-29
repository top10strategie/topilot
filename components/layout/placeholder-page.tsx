import { PageHero } from "@/components/layout/page-hero";

type PlaceholderPageProps = {
  title: string;
};

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHero title={title} />
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-6">
        <p className="text-sm text-muted-foreground">À venir</p>
      </div>
    </div>
  );
}
