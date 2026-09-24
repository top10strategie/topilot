"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

function ChartFallback() {
  return <Skeleton className="h-64 w-full rounded-xl" />;
}

/**
 * Un seul import() → un chunk Recharts partagé (bar + line + composed).
 */
const loadCharts = () => import("@/components/analyses/analysis-charts");

export const AnalysisBarChart = dynamic(
  () => loadCharts().then((mod) => mod.AnalysisBarChart),
  { ssr: false, loading: ChartFallback },
);

export const AnalysisLineChart = dynamic(
  () => loadCharts().then((mod) => mod.AnalysisLineChart),
  { ssr: false, loading: ChartFallback },
);

export const AnalysisComposedChart = dynamic(
  () => loadCharts().then((mod) => mod.AnalysisComposedChart),
  { ssr: false, loading: ChartFallback },
);
