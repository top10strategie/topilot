"use client";

import { useEffect, useState, useTransition } from "react";
import {
  checkPurgeReauthStatus,
  executePurgeYear,
  previewPurgeYear,
  reauthForPurge,
} from "@/actions/data-purge";
import {
  exportAnalysesOpportunitiesCsv,
  exportMissionsCsv,
  exportOpportunitiesCsv,
} from "@/actions/data-export";
import type { PurgeYearResult } from "@/lib/data-admin/purge";
import { maxPurgeableYear } from "@/lib/data-admin/purge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function triggerCsvDownload(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type DateRange = { from: string; to: string };

function ExportBlock({
  title,
  description,
  range,
  onRangeChange,
  onExport,
}: {
  title: string;
  description: string;
  range: DateRange;
  onRangeChange: (next: DateRange) => void;
  onExport: (from: string, to: string) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor={`${title}-from`}>Du</Label>
            <Input
              id={`${title}-from`}
              type="date"
              value={range.from}
              onChange={(e) =>
                onRangeChange({ ...range, from: e.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${title}-to`}>Au</Label>
            <Input
              id={`${title}-to`}
              type="date"
              value={range.to}
              onChange={(e) => onRangeChange({ ...range, to: e.target.value })}
            />
          </div>
        </div>
        <Button
          type="button"
          className="w-full"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              try {
                await onExport(range.from, range.to);
              } catch (err) {
                setError(
                  err instanceof Error ? err.message : "Export impossible.",
                );
              }
            });
          }}
        >
          {pending ? "Export…" : "Exporter CSV"}
        </Button>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  );
}

export function AdministrationDataPanel() {
  const maxYear = maxPurgeableYear();
  const defaultTo = new Date().toISOString().slice(0, 10);
  const defaultFrom = `${maxYear}-01-01`;

  const [syncDates, setSyncDates] = useState(true);
  const [oppRange, setOppRange] = useState<DateRange>({
    from: defaultFrom,
    to: defaultTo,
  });
  const [missionRange, setMissionRange] = useState<DateRange>({
    from: defaultFrom,
    to: defaultTo,
  });
  const [analysesRange, setAnalysesRange] = useState<DateRange>({
    from: defaultFrom,
    to: defaultTo,
  });

  const [reauthenticated, setReauthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [reauthError, setReauthError] = useState<string | null>(null);
  const [purgeYear, setPurgeYear] = useState(String(maxYear));
  const [yearConfirm, setYearConfirm] = useState("");
  const [exportedConfirm, setExportedConfirm] = useState(false);
  const [preview, setPreview] = useState<PurgeYearResult | null>(null);
  const [purgeMessage, setPurgeMessage] = useState<string | null>(null);
  const [purgeError, setPurgeError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    void checkPurgeReauthStatus().then((s) =>
      setReauthenticated(s.reauthenticated),
    );
  }, []);

  async function runExport(
    kind: "opportunities" | "missions" | "analyses",
    from: string,
    to: string,
  ) {
    const action =
      kind === "opportunities"
        ? exportOpportunitiesCsv
        : kind === "missions"
          ? exportMissionsCsv
          : exportAnalysesOpportunitiesCsv;
    const result = await action(from, to);
    if (!result.success) {
      throw new Error(result.error);
    }
    triggerCsvDownload(result.csv, result.filename);
  }

  return (
    <div className="scrollbar-none flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto pb-6">
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Exports CSV</h2>
          <p className="text-sm text-muted-foreground">
            Chaque export est indépendant ; cochez l&apos;option ci-dessous pour
            synchroniser les dates.
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={syncDates}
            onCheckedChange={(v) => {
              const on = v === true;
              setSyncDates(on);
              if (on) {
                setMissionRange(oppRange);
                setAnalysesRange(oppRange);
              }
            }}
          />
          Appliquer les mêmes dates aux trois exports
        </label>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <ExportBlock
            title="Opportunités"
            description="Stock dont closed_at, end_at ou une échéance de facturation tombe dans la période."
            range={oppRange}
            onRangeChange={(next) => {
              setOppRange(next);
              if (syncDates) {
                setMissionRange(next);
                setAnalysesRange(next);
              }
            }}
            onExport={(from, to) => runExport("opportunities", from, to)}
          />
          <ExportBlock
            title="Missions"
            description="Missions dont end_at est dans la période (sans date de fin : exclues)."
            range={missionRange}
            onRangeChange={(next) => {
              setMissionRange(next);
              if (syncDates) {
                setOppRange(next);
                setAnalysesRange(next);
              }
            }}
            onExport={(from, to) => runExport("missions", from, to)}
          />
          <ExportBlock
            title="Analyses opportunités"
            description="Un CSV agrégé (pipeline, CA client, CA pôle) sur la période, logique CA Analyses."
            range={analysesRange}
            onRangeChange={(next) => {
              setAnalysesRange(next);
              if (syncDates) {
                setOppRange(next);
                setMissionRange(next);
              }
            }}
            onExport={(from, to) => runExport("analyses", from, to)}
          />
        </div>
      </section>

      <section className="space-y-4 border-t border-border pt-6">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-destructive">
            Purge annuelle (irréversible)
          </h2>
          <p className="text-sm text-muted-foreground">
            Suppression définitive des opportunités, missions et de
            l&apos;historique de l&apos;année choisie.
          </p>
          <p className="text-sm text-muted-foreground">
            Les années disponibles à la suppression sont ≤ à N-3 de l&apos;année
            en cours. Les documents liés sont rattachés au client propriétaire
            quand c&apos;est possible.
          </p>
        </div>

        {!reauthenticated ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Vérification du mot de passe
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Une fois par session navigateur (jusqu&apos;à déconnexion ou
                fermeture).
              </p>
            </CardHeader>
            <CardContent className="flex flex-wrap items-end gap-3">
              {/* Leurres d’autofill : évite que le champ « Rechercher » soit pris pour l’identifiant. */}
              <input
                type="text"
                name="username"
                autoComplete="username"
                value=""
                readOnly
                tabIndex={-1}
                aria-hidden
                className="pointer-events-none absolute h-0 w-0 opacity-0"
              />
              <div className="space-y-1.5">
                <Label htmlFor="purge-password">Mot de passe</Label>
                <Input
                  id="purge-password"
                  name="purge-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button
                type="button"
                disabled={pending || !password.trim()}
                onClick={() => {
                  setReauthError(null);
                  startTransition(async () => {
                    const result = await reauthForPurge(password);
                    if (!result.success) {
                      setReauthError(
                        result.fieldErrors?.password ?? result.error,
                      );
                      return;
                    }
                    setPassword("");
                    setReauthenticated(true);
                  });
                }}
              >
                Vérifier
              </Button>
              {reauthError ? (
                <p className="w-full text-sm text-destructive">{reauthError}</p>
              ) : null}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Confirmer la purge</CardTitle>
              <p className="text-sm text-muted-foreground">
                Session vérifiée. Prévisualisez puis confirmez.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="purge-year">Année à purger</Label>
                  <Input
                    id="purge-year"
                    type="number"
                    min={2000}
                    max={maxYear}
                    value={purgeYear}
                    onChange={(e) => {
                      setPurgeYear(e.target.value);
                      setPreview(null);
                      setPurgeMessage(null);
                    }}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => {
                    setPurgeError(null);
                    setPurgeMessage(null);
                    startTransition(async () => {
                      const year = Number(purgeYear);
                      const result = await previewPurgeYear(year);
                      if (!result.success) {
                        setPurgeError(result.error);
                        setPreview(null);
                        return;
                      }
                      setPreview(result.data);
                    });
                  }}
                >
                  Prévisualiser
                </Button>
              </div>

              {preview ? (
                <ul className="list-inside list-disc text-sm text-muted-foreground">
                  <li>Opportunités : {preview.opportunities}</li>
                  <li>Missions : {preview.missions}</li>
                  <li>Séries de missions : {preview.mission_series}</li>
                  <li>Lignes d&apos;historique : {preview.audit_logs}</li>
                </ul>
              ) : null}

              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={exportedConfirm}
                  onCheckedChange={(v) => setExportedConfirm(v === true)}
                />
                J&apos;ai exporté mes données
              </label>

              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[10rem] flex-1 space-y-1.5">
                  <Label htmlFor="purge-year-confirm">
                    Tapez l&apos;année pour confirmer
                  </Label>
                  <Input
                    id="purge-year-confirm"
                    value={yearConfirm}
                    placeholder={purgeYear}
                    onChange={(e) => setYearConfirm(e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={
                    pending ||
                    !preview ||
                    yearConfirm !== purgeYear ||
                    !exportedConfirm
                  }
                  onClick={() => {
                    setPurgeError(null);
                    setPurgeMessage(null);
                    startTransition(async () => {
                      const year = Number(purgeYear);
                      const result = await executePurgeYear(year);
                      if (!result.success) {
                        setPurgeError(result.error);
                        return;
                      }
                      setPurgeMessage(
                        `Purge ${result.data.year} effectuée : ${result.data.opportunities} opportunités, ${result.data.missions} missions, ${result.data.mission_series} séries, ${result.data.audit_logs} historiques.`,
                      );
                      setPreview(null);
                      setYearConfirm("");
                      setExportedConfirm(false);
                    });
                  }}
                >
                  {pending ? "Purge…" : `Supprimer définitivement ${purgeYear}`}
                </Button>
              </div>

              {purgeError ? (
                <p className="text-sm text-destructive">{purgeError}</p>
              ) : null}
              {purgeMessage ? (
                <p className="text-sm text-foreground">{purgeMessage}</p>
              ) : null}
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
