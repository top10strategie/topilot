"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Chargement différé de Recharts (évite d'alourdir home / analyses au premier paint).
 */
export const AnalysisBarChart = dynamic(
  () =>
    import("@/components/analyses/analysis-bar-chart").then(
      (mod) => mod.AnalysisBarChart,
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="h-64 w-full rounded-xl" />,
  },
);
