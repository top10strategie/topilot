"use client";

import { useEffect, useState, useTransition } from "react";
import { ClockCounterClockwise } from "@phosphor-icons/react";
import { toast } from "sonner";
import { fetchAuditLogsForScope } from "@/actions/audit-logs";
import { AuditHistoryTable } from "@/components/audit/audit-history-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AuditEntityScope, AuditLogListItem } from "@/lib/audit/types";

type AuditHistoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope: AuditEntityScope;
  title?: string;
};

export function AuditHistoryDialog({
  open,
  onOpenChange,
  scope,
  title = "Historique",
}: AuditHistoryDialogProps) {
  const [logs, setLogs] = useState<AuditLogListItem[]>([]);
  const [isPending, startTransition] = useTransition();

  const scopeKey = JSON.stringify(scope);

  useEffect(() => {
    if (!open) return;
    startTransition(async () => {
      const result = await fetchAuditLogsForScope(
        JSON.parse(scopeKey) as AuditEntityScope,
      );
      if (!result.success) {
        toast.error(result.error);
        setLogs([]);
        return;
      }
      setLogs(result.logs);
    });
  }, [open, scopeKey]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-3xl flex-col gap-4 overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClockCounterClockwise className="size-5" aria-hidden />
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {isPending ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : (
            <AuditHistoryTable logs={logs} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
