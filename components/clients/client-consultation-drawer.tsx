"use client";

import { useRouter } from "next/navigation";
import { DrawerBody, DrawerFooterActions } from "@/components/drawers/drawer-section";
import type { DrawerHelpers } from "@/components/drawers/drawer-stack-context";
import { EntityFormDocumentationBlock } from "@/components/layout/entity-form-documentation-block";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getClientResponsibleName,
  getClientStatusLabel,
  getContactFullName,
} from "@/lib/clients/labels";
import type { ClientDetail } from "@/lib/clients/types";

type ClientConsultationDrawerProps = {
  client: ClientDetail;
  helpers: DrawerHelpers<null>;
};

/**
 * Tiroir de consultation client (lecture seule) — même structure que
 * le tiroir d'édition, footer "Aller au client" (cf. 07 §7).
 */
export function ClientConsultationDrawer({
  client,
  helpers,
}: ClientConsultationDrawerProps) {
  const router = useRouter();

  const addressLine = [
    client.address_street?.trim(),
    [client.address_zip?.trim(), client.address_city?.trim()]
      .filter(Boolean)
      .join(" "),
  ]
    .filter(Boolean)
    .join(", ");

  const contactsChronological = [...client.contacts].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  );

  const notesText = client.notes?.trim() ?? "";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DrawerBody className="space-y-6">
        <section className="space-y-4">
          <h3 className="text-sm font-semibold">Identification</h3>

          <div className="flex items-start gap-4">
            <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-lg font-semibold">
              {client.logo_url ? (
                <img
                  src={client.logo_url}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                client.client_name.slice(0, 2).toUpperCase()
              )}
            </div>
            <div className="min-w-0 space-y-2 text-sm">
              <p className="font-medium">{client.client_name}</p>
              <Badge variant={client.is_active ? "default" : "secondary"}>
                {getClientStatusLabel(client.is_active)}
              </Badge>
            </div>
          </div>

          <div className="grid gap-4 text-sm sm:grid-cols-2">
            <div className="grid gap-1">
              <p className="text-muted-foreground">Responsable client</p>
              <p className="font-medium">
                {getClientResponsibleName(client.responsible)}
              </p>
            </div>
            <div className="grid gap-1">
              <p className="text-muted-foreground">Site web</p>
              {client.website ? (
                <a
                  href={client.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all font-bold text-primary-foreground underline-offset-4 hover:underline"
                >
                  {client.website}
                </a>
              ) : (
                <p>—</p>
              )}
            </div>
          </div>
        </section>

        <section className="space-y-4 border-t pt-4">
          <h3 className="text-sm font-semibold">Complément</h3>

          <div className="grid gap-1 text-sm">
            <p className="text-muted-foreground">Adresse</p>
            <p className="font-medium">{addressLine || "—"}</p>
          </div>

          <div className="grid gap-1 text-sm">
            <p className="text-muted-foreground">Lien Drive</p>
            {client.drive_link ? (
              <a
                href={client.drive_link}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all font-medium text-primary underline-offset-4 hover:underline"
              >
                {client.drive_link}
              </a>
            ) : (
              <p>—</p>
            )}
          </div>

          <div className="grid gap-2 text-sm">
            <p className="text-muted-foreground">Contacts</p>
            {contactsChronological.length === 0 ? (
              <p className="text-muted-foreground">Aucun contact</p>
            ) : (
              <ul className="space-y-3">
                {contactsChronological.map((contact) => {
                  const phone = contact.phone_number?.trim() || null;
                  const email = contact.email_address?.trim() || null;
                  const jobTitle = contact.job_title?.trim() || null;
                  const showSecondLine = Boolean(jobTitle || email);

                  return (
                    <li key={contact.id} className="font-medium">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="min-w-0">
                          {getContactFullName(contact)}
                          {contact.is_main ? (
                            <span className="ml-1 text-xs font-normal text-muted-foreground">
                              (principal)
                            </span>
                          ) : null}
                        </span>
                        {phone ? (
                          <span className="shrink-0 text-xs font-normal text-muted-foreground">
                            {phone}
                          </span>
                        ) : null}
                      </div>
                      {showSecondLine ? (
                        <div className="mt-0.5 flex items-baseline justify-between gap-3">
                          <span className="min-w-0 text-xs font-normal text-muted-foreground">
                            {jobTitle ?? ""}
                          </span>
                          {email ? (
                            <span className="shrink-0 text-xs font-normal text-muted-foreground">
                              {email}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="grid gap-2 text-sm">
            <p className="text-muted-foreground">Catégories</p>
            <div className="flex flex-wrap gap-1">
              {client.categories.length === 0 ? (
                <span>—</span>
              ) : (
                client.categories.map((category) => (
                  <Badge key={category.id} variant="secondary">
                    {category.label}
                  </Badge>
                ))
              )}
            </div>
          </div>

          {notesText ? (
            <div className="grid gap-1 text-sm">
              <p className="text-muted-foreground">Notes</p>
              <p className="whitespace-pre-wrap text-muted-foreground">
                {notesText}
              </p>
            </div>
          ) : null}

          <EntityFormDocumentationBlock
            entity="client"
            entityId={client.id}
            includeWikis={false}
            readOnly
          />
        </section>
      </DrawerBody>

      <DrawerFooterActions>
        <Button
          type="button"
          onClick={() => {
            helpers.dismiss();
            router.push(`/clients/${client.id}`);
          }}
        >
          Aller au client
        </Button>
      </DrawerFooterActions>
    </div>
  );
}
