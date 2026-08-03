"use client";

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { updateOwnProfile } from "@/actions/settings";
import { DrawerBody, DrawerFooterActions } from "@/components/drawers/drawer-section";
import type { DrawerHelpers } from "@/components/drawers/drawer-stack-context";
import { ThemePreferenceButtons } from "@/components/settings/theme-preference-buttons";
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
import type { OwnProfile, AppTheme } from "@/lib/settings/types";

type TeamOption = { id: string; team_name: string };

type ProfileFormDrawerProps = {
  profile: OwnProfile;
  teams: TeamOption[];
  helpers: DrawerHelpers<true>;
};

export function ProfileFormDrawer({
  profile,
  teams,
  helpers,
}: ProfileFormDrawerProps) {
  const [firstName, setFirstName] = useState(profile.first_name);
  const [lastName, setLastName] = useState(profile.last_name);
  const [email, setEmail] = useState(profile.email);
  const [teamId, setTeamId] = useState(profile.team_id);
  const [jobTitle, setJobTitle] = useState(profile.job_title);
  const [theme, setTheme] = useState<AppTheme>(profile.theme);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<string, string>>
  >({});
  const [isPending, startTransition] = useTransition();

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      const formData = new FormData();
      formData.set("first_name", firstName);
      formData.set("last_name", lastName);
      formData.set("email", email);
      formData.set("team_id", teamId);
      formData.set("job_title", jobTitle);
      formData.set("theme", theme);
      if (avatarFile) formData.set("avatar", avatarFile);

      const result = await updateOwnProfile(formData);
      if (!result.success) {
        setFieldErrors(result.fieldErrors ?? {});
        toast.error(result.error);
        return;
      }
      toast.success("Profil mis à jour.");
      helpers.resolve(true);
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
      <DrawerBody className="space-y-4">
        <VisualFileField
          id="profile_avatar"
          label="Avatar"
          value={avatarFile}
          existingUrl={profile.profile_picture_url}
          onChange={setAvatarFile}
          disabled={isPending}
          error={fieldErrors.avatar}
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="last_name">
              Nom <span className="text-destructive">*</span>
            </Label>
            <Input
              id="last_name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={isPending}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="first_name">
              Prénom <span className="text-destructive">*</span>
            </Label>
            <Input
              id="first_name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={isPending}
              required
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">
            Email <span className="text-destructive">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isPending}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label>
            Pôle <span className="text-destructive">*</span>
          </Label>
          <Select value={teamId} onValueChange={setTeamId} disabled={isPending}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un pôle" />
            </SelectTrigger>
            <SelectContent>
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.team_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="job_title">
            Poste <span className="text-destructive">*</span>
          </Label>
          <Input
            id="job_title"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            disabled={isPending}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label>Thème favori</Label>
          <ThemePreferenceButtons
            initialTheme={theme}
            disabled={isPending}
            persistImmediate={false}
            onThemeChange={setTheme}
          />
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
          {isPending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </DrawerFooterActions>
    </form>
  );
}
