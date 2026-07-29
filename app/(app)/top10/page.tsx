import { Top10PageClient } from "@/components/collaborators/top10-page-client";
import { loadPeopleDirectory } from "@/lib/collaborators/queries";

export default async function Top10Page() {
  const { teams, collaborators } = await loadPeopleDirectory();

  return (
    <Top10PageClient teams={teams} collaborators={collaborators} />
  );
}
