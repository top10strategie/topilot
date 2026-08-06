"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MONTH_LABELS_FR = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
] as const;

type YearSelectProps = {
  years: number[];
  value: number;
  onChange: (year: number) => void;
  id?: string;
};

export function AnalysisYearSelect({
  years,
  value,
  onChange,
  id,
}: YearSelectProps) {
  return (
    <Select
      value={String(value)}
      onValueChange={(v) => onChange(Number(v))}
    >
      <SelectTrigger id={id} size="sm" className="w-[110px]" aria-label="Année">
        <SelectValue placeholder="Année" />
      </SelectTrigger>
      <SelectContent>
        {years.map((year) => (
          <SelectItem key={year} value={String(year)}>
            {year}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

type MonthSelectProps = {
  value: number;
  onChange: (month: number) => void;
  /** Mois (1–12) au-delà desquels les options sont désactivées. */
  maxEnabledMonth?: number;
  id?: string;
};

export function AnalysisMonthSelect({
  value,
  onChange,
  maxEnabledMonth = 12,
  id,
}: MonthSelectProps) {
  return (
    <Select
      value={String(value)}
      onValueChange={(v) => onChange(Number(v))}
    >
      <SelectTrigger id={id} size="sm" className="w-[130px]" aria-label="Mois">
        <SelectValue placeholder="Mois" />
      </SelectTrigger>
      <SelectContent>
        {MONTH_LABELS_FR.map((label, index) => {
          const month = index + 1;
          return (
            <SelectItem
              key={month}
              value={String(month)}
              disabled={month > maxEnabledMonth}
            >
              {label}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
