import type { ClientResponsibleItem, ContactClientItem } from "./types";

export function getClientResponsibleName(
  person: Pick<ClientResponsibleItem, "first_name" | "last_name">,
): string {
  return `${person.first_name} ${person.last_name}`.trim();
}

export function getContactFullName(
  contact: Pick<ContactClientItem, "first_name" | "last_name">,
): string {
  return `${contact.first_name} ${contact.last_name}`.trim();
}

export function getClientStatusLabel(isActive: boolean): string {
  return isActive ? "Actif" : "Inactif";
}
