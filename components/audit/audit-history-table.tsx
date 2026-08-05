"use client";

import {
  formatAuditDateTime,
  getAuditActionLabel,
  getAuditCollaboratorDisplayName,
  getAuditEntityTypeLabel,
} from "@/lib/audit/labels";
import type { AuditLogListItem } from "@/lib/audit/types";

type AuditHistoryTableProps = {
  logs: AuditLogListItem[];
  emptyMessage?: string;
};

export function AuditHistoryTable({
  logs,
  emptyMessage = "Aucun événement à afficher.",
}: AuditHistoryTableProps) {
  if (logs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{emptyMessage}</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b bg-muted/40">
          <tr>
            <th className="px-3 py-2 font-medium">Date</th>
            <th className="px-3 py-2 font-medium">Collaborateur</th>
            <th className="px-3 py-2 font-medium">Sujet</th>
            <th className="px-3 py-2 font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-b last:border-0">
              <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                {formatAuditDateTime(log.created_at)}
              </td>
              <td className="px-3 py-2 font-medium">
                {getAuditCollaboratorDisplayName({
                  first_name: log.collaborator_first_name,
                  last_name: log.collaborator_last_name,
                })}
              </td>
              <td className="px-3 py-2">
                {getAuditEntityTypeLabel(log.entity_type)}
              </td>
              <td className="px-3 py-2">
                {getAuditActionLabel(log.action)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
