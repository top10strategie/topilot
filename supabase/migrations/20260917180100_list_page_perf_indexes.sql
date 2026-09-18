-- Indexes ciblés pour list_*_page (ORDER BY created_at, filtres fréquents).

CREATE INDEX IF NOT EXISTS idx_mission_created_at_desc
  ON public.mission (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_opportunity_created_at_desc
  ON public.opportunity (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_is_active
  ON public.client (is_active);

CREATE INDEX IF NOT EXISTS idx_client_address_city
  ON public.client (address_city)
  WHERE address_city IS NOT NULL AND length(trim(address_city)) > 0;

CREATE INDEX IF NOT EXISTS idx_mission_collaborator_created
  ON public.mission (collaborator_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_opportunity_collaborator_created
  ON public.opportunity (collaborator_id, created_at DESC);
