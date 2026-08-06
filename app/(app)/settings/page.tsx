import { Suspense } from "react";
import { redirect } from "next/navigation";
import { SettingsPageClient } from "@/components/settings/settings-page-client";
import { PageHero } from "@/components/layout/page-hero";
import { Skeleton } from "@/components/ui/skeleton";
import { listBusinessCategories } from "@/lib/categories/queries";
import { loadPeopleDirectory } from "@/lib/collaborators/queries";
import { getOwnProfile } from "@/lib/settings/queries";

async function SettingsContent() {
  const [profile, directory, businessCategories] = await Promise.all([
    getOwnProfile(),
    loadPeopleDirectory(),
    listBusinessCategories(),
  ]);

  if (!profile) {
    redirect("/auth/login");
  }

  return (
    <SettingsPageClient
      profile={profile}
      teams={directory.teams.map((t) => ({
        id: t.id,
        team_name: t.team_name,
      }))}
      businessCategories={businessCategories}
    />
  );
}

function SettingsFallback() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHero title="Profil & préférences" />
      <div className="space-y-4 px-4 py-4 md:px-6">
        <Skeleton className="h-16 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsFallback />}>
      <SettingsContent />
    </Suspense>
  );
}
