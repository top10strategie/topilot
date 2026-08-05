"use client";

import { useState } from "react";
import { ClockCounterClockwise } from "@phosphor-icons/react";
import { AuditHistoryDialog } from "@/components/audit/audit-history-dialog";
import { IconActionButton } from "@/components/layout/icon-action-button";
import type { AuditEntityScope } from "@/lib/audit/types";
import { cn } from "@/lib/utils";

type AuditHistoryButtonProps = {
  scope: AuditEntityScope;
  dialogTitle?: string;
  className?: string;
};

/**
 * Bouton Hero Historique (séparé des autres actions) + modale lecture seule.
 */
export function AuditHistoryButton({
  scope,
  dialogTitle,
  className,
}: AuditHistoryButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        className={cn(
          "ml-1 flex items-center border-l border-border pl-2",
          className,
        )}
      >
        <IconActionButton
          label="Historique"
          variant="outline"
          onClick={() => setOpen(true)}
        >
          <ClockCounterClockwise className="size-4" />
        </IconActionButton>
      </div>
      <AuditHistoryDialog
        open={open}
        onOpenChange={setOpen}
        scope={scope}
        title={dialogTitle}
      />
    </>
  );
}
