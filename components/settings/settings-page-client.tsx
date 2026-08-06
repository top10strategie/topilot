"use client";

import { useState, useTransition } from "react";
import { PencilSimple } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updatePreferredMissionCategories } from "@/actions/settings";
import { PasswordChangeForm } from "@/components/settings/password-change-form";
import { ProfileFormDrawer } from "@/components/settings/profile-form-drawer";
import { ThemePreferenceButtons } from "@/components/settings/theme-preference-buttons";
import { useDrawerStack } from "@/components/drawers/drawer-stack-context";
import { PageHero } from "@/components/layout/page-hero";
import { IconActionButton } from "@/components/layout/icon-action-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { BusinessCategoryItem } from "@/lib/categories/types";
import {
  getCollaboratorFullName,
  getCollaboratorRoleLabel,
  getCollaboratorStatusLabel,
} from "@/lib/collaborators/labels";
import type { OwnProfile } from "@/lib/settings/types";

type TeamOption = { id: string; team_name: string };

type SettingsPageClientProps = {
  profile: OwnProfile;
  teams: TeamOption[];
  businessCategories: BusinessCategoryItem[];
};

export function SettingsPageClient({
  profile,
  teams,
  businessCategories,
}: SettingsPageClientProps) {
  const { pushDrawer } = useDrawerStack();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(
    () =>
      profile.preferred_mission_category_ids.filter((id) =>
        businessCategories.some((category) => category.id === id),
      ),
  );

  const openEdit = () => {
    void pushDrawer({
      title: "Modification profil",
      content: (helpers) => (
        <ProfileFormDrawer
          profile={profile}
          teams={teams}
          helpers={helpers}
        />
      ),
    }).then((saved) => {
      if (saved) router.refresh();
    });
  };

  const toggleCategory = (categoryId: string, checked: boolean) => {
    setSelectedCategoryIds((prev) => {
      if (checked) {
        return prev.includes(categoryId) ? prev : [...prev, categoryId];
      }
      return prev.filter((id) => id !== categoryId);
    });
  };

  const savePreferredCategories = () => {
    startTransition(async () => {
      const result = await updatePreferredMissionCategories(selectedCategoryIds);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Filtres de missions enregistrés.");
      router.refresh();
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHero
        title="Profil & préférences"
        actions={
          <IconActionButton
            label="Modifier le profil"
            onClick={openEdit}
          >
            <PencilSimple className="size-4" />
          </IconActionButton>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex size-16 items-center justify-center overflow-hidden rounded-full border bg-muted text-lg font-semibold">
                {profile.profile_picture_url ? (
                  <img
                    src={profile.profile_picture_url}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  <span>
                    {profile.first_name.charAt(0)}
                    {profile.last_name.charAt(0)}
                  </span>
                )}
              </div>
              <div>
                <h2 className="text-lg font-semibold">
                  {getCollaboratorFullName(profile)}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {profile.job_title}
                </p>
              </div>
            </div>
            <dl className="grid gap-2 text-sm">
              <div className="flex justify-between gap-4 border-b py-2">
                <dt className="text-muted-foreground">Email</dt>
                <dd>{profile.email}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b py-2">
                <dt className="text-muted-foreground">Rôle</dt>
                <dd>{getCollaboratorRoleLabel(profile.role)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b py-2">
                <dt className="text-muted-foreground">Statut</dt>
                <dd>{getCollaboratorStatusLabel(profile.status)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b py-2">
                <dt className="text-muted-foreground">Pôle</dt>
                <dd>{profile.team_name}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b py-2">
                <dt className="text-muted-foreground">Poste</dt>
                <dd>{profile.job_title}</dd>
              </div>
            </dl>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Catégories missions préférées
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {businessCategories.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Aucune catégorie métier disponible.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {businessCategories.map((category) => {
                      const checked = selectedCategoryIds.includes(category.id);
                      const checkboxId = `preferred-mission-cat-${category.id}`;
                      return (
                        <li
                          key={category.id}
                          className="flex items-center gap-2"
                        >
                          <Checkbox
                            id={checkboxId}
                            checked={checked}
                            disabled={isPending}
                            onCheckedChange={(value) =>
                              toggleCategory(category.id, value === true)
                            }
                          />
                          <Label
                            htmlFor={checkboxId}
                            className="cursor-pointer font-normal"
                          >
                            {category.label}
                            {category.is_private ? (
                              <span className="ml-1 text-muted-foreground">
                                (privée)
                              </span>
                            ) : null}
                          </Label>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <div className="flex justify-start">
                  <Button
                    type="button"
                    size="sm"
                    disabled={isPending}
                    onClick={savePreferredCategories}
                  >
                    Filtrer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Thème favori</CardTitle>
              </CardHeader>
              <CardContent>
                <ThemePreferenceButtons initialTheme={profile.theme} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sécurité</CardTitle>
              </CardHeader>
              <CardContent>
                <PasswordChangeForm />
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
