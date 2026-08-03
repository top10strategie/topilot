"use client";

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import {
  createContactClient,
  updateContactClient,
} from "@/actions/contact-clients";
import { DrawerBody, DrawerFooterActions } from "@/components/drawers/drawer-section";
import type { DrawerHelpers } from "@/components/drawers/drawer-stack-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VisualFileField } from "@/components/visuels/visual-file-field";
import type { ContactClientItem } from "@/lib/clients/types";

export type ContactFormResult = {
  id: string;
  client_id: string;
  first_name: string;
  last_name: string;
  is_main: boolean;
};

type ContactFormDrawerProps = {
  mode: "create" | "edit";
  clientId: string;
  contact?: ContactClientItem;
  /** Nombre de contacts du client (pour bloquer le retrait du seul principal). */
  contactCount: number;
  helpers: DrawerHelpers<ContactFormResult>;
};

export function ContactFormDrawer({
  mode,
  clientId,
  contact,
  contactCount,
  helpers,
}: ContactFormDrawerProps) {
  const [firstName, setFirstName] = useState(contact?.first_name ?? "");
  const [lastName, setLastName] = useState(contact?.last_name ?? "");
  const [jobTitle, setJobTitle] = useState(contact?.job_title ?? "");
  const [email, setEmail] = useState(contact?.email_address ?? "");
  const [phone, setPhone] = useState(contact?.phone_number ?? "");
  const [isMain, setIsMain] = useState(contact?.is_main ?? contactCount === 0);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<string, string>>
  >({});
  const [isPending, startTransition] = useTransition();

  const isSoleMain = Boolean(contact?.is_main) && contactCount <= 1;
  const mainLocked = isSoleMain || (mode === "create" && contactCount === 0);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setFieldErrors({});

    startTransition(async () => {
      const formData = new FormData();
      formData.set("client_id", clientId);
      formData.set("first_name", firstName);
      formData.set("last_name", lastName);
      formData.set("job_title", jobTitle);
      formData.set("email_address", email);
      formData.set("phone_number", phone);
      formData.set("is_main", isMain || mainLocked ? "true" : "false");
      if (avatarFile) {
        formData.set("avatar", avatarFile);
      }

      const result =
        mode === "create"
          ? await createContactClient(formData)
          : await updateContactClient(contact!.id, formData);

      if (!result.success) {
        setFieldErrors(result.fieldErrors ?? {});
        toast.error(result.error);
        return;
      }

      toast.success(
        mode === "create" ? "Contact créé." : "Contact mis à jour.",
      );
      helpers.resolve({
        id: result.id,
        client_id: result.client_id,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        is_main: result.is_main,
      });
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <DrawerBody>
        <VisualFileField
          id="contact_avatar"
          label="Photo"
          value={avatarFile}
          existingUrl={contact?.profile_picture_url}
          onChange={setAvatarFile}
          disabled={isPending}
          error={fieldErrors.avatar}
        />

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="contact_first_name">
              Prénom <span className="text-destructive">*</span>
            </Label>
            <Input
              id="contact_first_name"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              disabled={isPending}
              required
              autoFocus
              aria-invalid={Boolean(fieldErrors.first_name)}
            />
            {fieldErrors.first_name ? (
              <p className="text-sm text-destructive">{fieldErrors.first_name}</p>
            ) : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="contact_last_name">
              Nom <span className="text-destructive">*</span>
            </Label>
            <Input
              id="contact_last_name"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              disabled={isPending}
              required
              aria-invalid={Boolean(fieldErrors.last_name)}
            />
            {fieldErrors.last_name ? (
              <p className="text-sm text-destructive">{fieldErrors.last_name}</p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="contact_job">Poste</Label>
          <Input
            id="contact_job"
            value={jobTitle}
            onChange={(event) => setJobTitle(event.target.value)}
            disabled={isPending}
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="contact_email">Email</Label>
            <Input
              id="contact_email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isPending}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="contact_phone">Téléphone</Label>
            <Input
              id="contact_phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              disabled={isPending}
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label>Contact principal</Label>
          <Select
            value={isMain || mainLocked ? "yes" : "no"}
            onValueChange={(value) => setIsMain(value === "yes")}
            disabled={isPending || mainLocked}
          >
            <SelectTrigger aria-label="Contact principal">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="yes">Oui</SelectItem>
              <SelectItem value="no">Non</SelectItem>
            </SelectContent>
          </Select>
          {mainLocked ? (
            <p className="text-xs text-muted-foreground">
              Un client doit toujours avoir un contact principal. Désignez un
              autre contact avant de retirer celui-ci.
            </p>
          ) : null}
        </div>
      </DrawerBody>

      <DrawerFooterActions>
        <Button
          type="button"
          variant="outline"
          onClick={() => helpers.dismiss()}
          disabled={isPending}
        >
          Annuler
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending
            ? "Enregistrement…"
            : mode === "create"
              ? "Créer"
              : "Enregistrer"}
        </Button>
      </DrawerFooterActions>
    </form>
  );
}
