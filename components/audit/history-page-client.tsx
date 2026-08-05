"use client";

import { useMemo, useState, useTransition } from "react";
import {
  ClockCounterClockwise,
  FunnelSimple,
  MagnifyingGlass,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { fetchAuditLogsForPage } from "@/actions/audit-logs";
import { AuditHistoryTable } from "@/components/audit/audit-history-table";
import { IconActionButton } from "@/components/layout/icon-action-button";
import { PageHero } from "@/components/layout/page-hero";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  getAuditActionLabel,
  getAuditCollaboratorDisplayName,
  getAuditEntityTypeLabel,
} from "@/lib/audit/labels";
import type {
  AuditContactOption,
  AuditHistoryPageFilters,
  AuditLogListItem,
} from "@/lib/audit/types";
import type { CategoryItem } from "@/lib/categories/types";
import { getContactFullName } from "@/lib/clients/labels";
import type { ClientListItem } from "@/lib/clients/types";

type ToolOption = { id: string; tool_name: string };

type HistoryPageClientProps = {
  initialLogs: AuditLogListItem[];
  clients: ClientListItem[];
  contacts: AuditContactOption[];
  categories: CategoryItem[];
  tools: ToolOption[];
};

type DraftFilters = {
  dateFrom: string;
  dateTo: string;
  clientId: string;
  contactId: string;
  categoryId: string;
  toolId: string;
  focusMissions: boolean;
  focusOpportunities: boolean;
  focusRecurrences: boolean;
};

const EMPTY_FILTERS: DraftFilters = {
  dateFrom: "",
  dateTo: "",
  clientId: "",
  contactId: "",
  categoryId: "",
  toolId: "",
  focusMissions: false,
  focusOpportunities: false,
  focusRecurrences: false,
};

function toApiFilters(draft: DraftFilters): AuditHistoryPageFilters {
  return {
    dateFrom: draft.dateFrom || undefined,
    dateTo: draft.dateTo || undefined,
    clientId: draft.clientId || undefined,
    contactId: draft.contactId || undefined,
    categoryId: draft.categoryId || undefined,
    toolId: draft.toolId || undefined,
    focusMissions: draft.focusMissions || undefined,
    focusOpportunities: draft.focusOpportunities || undefined,
    focusRecurrences: draft.focusRecurrences || undefined,
  };
}

export function HistoryPageClient({
  initialLogs,
  clients,
  contacts,
  categories,
  tools,
}: HistoryPageClientProps) {
  const [query, setQuery] = useState("");
  const [logs, setLogs] = useState(initialLogs);
  const [appliedFilters, setAppliedFilters] =
    useState<DraftFilters>(EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] = useState<DraftFilters>(EMPTY_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const filteredLogs = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("fr");
    if (!q) return logs;
    return logs.filter((log) => {
      const blob = [
        getAuditCollaboratorDisplayName({
          first_name: log.collaborator_first_name,
          last_name: log.collaborator_last_name,
        }),
        getAuditEntityTypeLabel(log.entity_type),
        getAuditActionLabel(log.action),
      ]
        .join(" ")
        .toLocaleLowerCase("fr");
      return blob.includes(q);
    });
  }, [logs, query]);

  const applyFilters = (next: DraftFilters) => {
    startTransition(async () => {
      const result = await fetchAuditLogsForPage(toApiFilters(next));
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setLogs(result.logs);
      setAppliedFilters(next);
      setFilterOpen(false);
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHero
        title="Historique du CRM"
        actions={
          <div className="flex w-full max-w-md items-center gap-2 md:w-auto md:max-w-none">
            <div className="relative min-w-0 flex-1 md:w-72 md:flex-none">
              <MagnifyingGlass
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                type="search"
                placeholder="Rechercher…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="pl-8"
                aria-label="Recherche dans l'historique"
              />
            </div>
            <IconActionButton
              label="Filtres"
              onClick={() => {
                setDraftFilters(appliedFilters);
                setFilterOpen(true);
              }}
            >
              <FunnelSimple className="size-4" />
            </IconActionButton>
          </div>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-4 md:px-6">
        <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
          <ClockCounterClockwise className="size-4 shrink-0" aria-hidden />
          <span>
            {isPending
              ? "Chargement…"
              : `${filteredLogs.length} événement${filteredLogs.length > 1 ? "s" : ""}`}
          </span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <AuditHistoryTable logs={filteredLogs} />
        </div>
      </div>

      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Filtres historique</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="audit_date_from">Date de début</Label>
                <Input
                  id="audit_date_from"
                  type="date"
                  value={draftFilters.dateFrom}
                  onChange={(event) =>
                    setDraftFilters((prev) => ({
                      ...prev,
                      dateFrom: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="audit_date_to">Date de fin</Label>
                <Input
                  id="audit_date_to"
                  type="date"
                  value={draftFilters.dateTo}
                  onChange={(event) =>
                    setDraftFilters((prev) => ({
                      ...prev,
                      dateTo: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Client</Label>
              <Select
                value={draftFilters.clientId || "__unset__"}
                onValueChange={(value) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    clientId: value === "__unset__" ? "" : value,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Tous les clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__unset__">Tous les clients</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.client_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Contact</Label>
              <Select
                value={draftFilters.contactId || "__unset__"}
                onValueChange={(value) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    contactId: value === "__unset__" ? "" : value,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Tous les contacts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__unset__">Tous les contacts</SelectItem>
                  {contacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {getContactFullName(contact)} ({contact.client_name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Catégorie</Label>
              <Select
                value={draftFilters.categoryId || "__unset__"}
                onValueChange={(value) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    categoryId: value === "__unset__" ? "" : value,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Toutes les catégories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__unset__">
                    Toutes les catégories
                  </SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Outil</Label>
              <Select
                value={draftFilters.toolId || "__unset__"}
                onValueChange={(value) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    toolId: value === "__unset__" ? "" : value,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Tous les outils" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__unset__">Tous les outils</SelectItem>
                  {tools.map((tool) => (
                    <SelectItem key={tool.id} value={tool.id}>
                      {tool.tool_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3 rounded-md border p-3">
              <p className="text-sm font-medium">Focaliser sur</p>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="focus_missions">Missions</Label>
                <Switch
                  id="focus_missions"
                  checked={draftFilters.focusMissions}
                  onCheckedChange={(checked) =>
                    setDraftFilters((prev) => ({
                      ...prev,
                      focusMissions: checked,
                    }))
                  }
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="focus_opportunities">Opportunités</Label>
                <Switch
                  id="focus_opportunities"
                  checked={draftFilters.focusOpportunities}
                  onCheckedChange={(checked) =>
                    setDraftFilters((prev) => ({
                      ...prev,
                      focusOpportunities: checked,
                    }))
                  }
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="focus_recurrences">Récurrences</Label>
                <Switch
                  id="focus_recurrences"
                  checked={draftFilters.focusRecurrences}
                  onCheckedChange={(checked) =>
                    setDraftFilters((prev) => ({
                      ...prev,
                      focusRecurrences: checked,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => {
                setDraftFilters(EMPTY_FILTERS);
                applyFilters(EMPTY_FILTERS);
              }}
            >
              Effacer
            </Button>
            <Button
              type="button"
              disabled={isPending}
              onClick={() => applyFilters(draftFilters)}
            >
              {isPending ? "Filtrage…" : "Filtrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
