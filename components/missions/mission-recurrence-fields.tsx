"use client";

import { Repeat, StopCircle } from "@phosphor-icons/react";
import { IconActionButton } from "@/components/layout/icon-action-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getMissionRecurrenceFrequencyLabel,
  MISSION_RECURRENCE_FREQUENCIES,
} from "@/lib/missions/labels";
import type { MissionRecurrenceFrequency } from "@/lib/missions/types";
import { cn } from "@/lib/utils";

export type MissionRecurrenceDraft = {
  enabled: boolean;
  expanded: boolean;
  frequency: MissionRecurrenceFrequency | null;
  startsOn: string;
  endsOn: string;
};

type MissionRecurrenceFieldsProps = {
  draft: MissionRecurrenceDraft;
  onChange: (next: MissionRecurrenceDraft) => void;
  hasExistingSeries: boolean;
  seriesStopped: boolean;
  disabled?: boolean;
  onRequestStop?: () => void;
  /** Mode consultation lecture seule. */
  readOnly?: boolean;
};

function todayYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

export function createEmptyRecurrenceDraft(
  existing?: {
    frequency: MissionRecurrenceFrequency;
    starts_on: string;
    ends_on: string | null;
  } | null,
): MissionRecurrenceDraft {
  // Remove unused stopped var warning in createEmptyRecurrenceDraft
  if (!existing) {
    return {
      enabled: false,
      expanded: false,
      frequency: null,
      startsOn: todayYmd(),
      endsOn: "",
    };
  }
  return {
    enabled: true,
    expanded: true,
    frequency: existing.frequency,
    startsOn: existing.starts_on,
    endsOn: existing.ends_on ?? "",
  };
}

/**
 * Section Récurrence (create/edit) ou bandeau lecture seule (consultation).
 */
export function MissionRecurrenceFields({
  draft,
  onChange,
  hasExistingSeries,
  seriesStopped,
  disabled,
  onRequestStop,
  readOnly = false,
}: MissionRecurrenceFieldsProps) {
  if (readOnly) {
    if (!draft.enabled || !draft.frequency) return null;
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Récurrence</h3>
          {!seriesStopped && onRequestStop ? (
            <IconActionButton
              label="Arrêter la récurrence"
              attention
              onClick={onRequestStop}
            >
              <StopCircle className="size-4" />
            </IconActionButton>
          ) : null}
        </div>
        <dl className="grid gap-2 text-sm">
          <div>
            <dt className="text-muted-foreground">Fréquence</dt>
            <dd className="font-medium">
              {getMissionRecurrenceFrequencyLabel(draft.frequency)}
            </dd>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <dt className="text-muted-foreground">Début de série</dt>
              <dd className="font-medium">{draft.startsOn || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Fin de série</dt>
              <dd className="font-medium">{draft.endsOn || "—"}</dd>
            </div>
          </div>
        </dl>
      </div>
    );
  }

  const showStop = hasExistingSeries && !seriesStopped;
  const showBody = draft.enabled && draft.expanded;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Récurrence</h3>
        {showStop ? (
          onRequestStop ? (
            <IconActionButton
              label="Arrêter la récurrence"
              attention
              disabled={disabled}
              onClick={onRequestStop}
            >
              <StopCircle className="size-4" />
            </IconActionButton>
          ) : null
        ) : (
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Définir une récurrence"
            title="Définir une récurrence"
            disabled={disabled}
            onClick={() =>
              onChange({
                ...draft,
                enabled: true,
                expanded: !draft.expanded,
                startsOn: draft.startsOn || todayYmd(),
              })
            }
          >
            <Repeat className="size-4" />
          </Button>
        )}
      </div>

      {showBody || showStop ? (
        <div className="space-y-3">
          <div className="grid gap-2">
            <Label>
              Fréquence <span className="text-destructive">*</span>
            </Label>
            <div className="flex flex-wrap gap-2">
              {MISSION_RECURRENCE_FREQUENCIES.map((frequency) => (
                <Button
                  key={frequency}
                  type="button"
                  size="sm"
                  variant={draft.frequency === frequency ? "default" : "outline"}
                  disabled={disabled}
                  className={cn(draft.frequency === frequency && "pointer-events-none")}
                  onClick={() =>
                    onChange({
                      ...draft,
                      enabled: true,
                      expanded: true,
                      frequency,
                    })
                  }
                >
                  {getMissionRecurrenceFrequencyLabel(frequency)}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="series_starts_on">Début de série</Label>
              <Input
                id="series_starts_on"
                type="date"
                value={draft.startsOn}
                disabled={disabled}
                onChange={(event) =>
                  onChange({
                    ...draft,
                    enabled: true,
                    startsOn: event.target.value,
                  })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="series_ends_on">Fin de série</Label>
              <Input
                id="series_ends_on"
                type="date"
                value={draft.endsOn}
                disabled={disabled}
                onChange={(event) =>
                  onChange({
                    ...draft,
                    enabled: true,
                    endsOn: event.target.value,
                  })
                }
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
