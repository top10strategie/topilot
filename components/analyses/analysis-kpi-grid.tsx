import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type KpiItem = {
  label: string;
  value: string;
  /** Ligne secondaire sous la valeur (ex. total prévisionnel). */
  secondary?: string;
};

type AnalysisKpiGridProps = {
  items: KpiItem[];
  className?: string;
};

export function AnalysisKpiGrid({ items, className }: AnalysisKpiGridProps) {
  return (
    <div
      className={cn(
        "grid gap-3 sm:grid-cols-2 xl:grid-cols-4",
        className,
      )}
    >
      {items.map((item) => (
        <Card key={item.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {item.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-2xl font-semibold tracking-tight">{item.value}</p>
            {item.secondary ? (
              <p className="text-sm text-muted-foreground">{item.secondary}</p>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
