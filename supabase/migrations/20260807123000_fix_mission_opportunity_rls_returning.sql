-- ============================================================================
-- TOPilot — Fix RLS mission/opportunity pour INSERT…RETURNING
-- Symptôme : Collaborateur → createMissionRecord → 42501
--   "new row violates row-level security policy for table mission"
-- Cause : policies SELECT/UPDATE appelaient can_access_mission(id) /
--   can_access_opportunity(id), qui re-SELECTionnent la même table. Pendant
--   INSERT…RETURNING la nouvelle ligne est invisible → échec.
-- Fix : inliner le contrôle sur les colonnes de la ligne (client_id, etc.).
--   can_access_* restent pour les tables de jonction.
-- ============================================================================

DROP POLICY IF EXISTS "mission_select_active" ON public.mission;
DROP POLICY IF EXISTS "mission_update_active" ON public.mission;
DROP POLICY IF EXISTS "mission_insert_active" ON public.mission;

CREATE POLICY "mission_insert_active" ON public.mission
  FOR INSERT WITH CHECK (
    public.is_active_collaborator()
    AND (client_id IS NULL OR public.can_access_client(client_id))
    AND (opportunity_id IS NULL OR public.can_access_opportunity(opportunity_id))
  );

CREATE POLICY "mission_select_active" ON public.mission
  FOR SELECT USING (
    public.is_active_collaborator()
    AND (
      public.is_manager_or_direction()
      OR (
        NOT public.has_private_business_category('mission', id)
        AND (client_id IS NULL OR public.can_access_client(client_id))
        AND (opportunity_id IS NULL OR public.can_access_opportunity(opportunity_id))
      )
    )
  );

CREATE POLICY "mission_update_active" ON public.mission
  FOR UPDATE
  USING (
    public.is_active_collaborator()
    AND (
      public.is_manager_or_direction()
      OR (
        NOT public.has_private_business_category('mission', id)
        AND (client_id IS NULL OR public.can_access_client(client_id))
        AND (opportunity_id IS NULL OR public.can_access_opportunity(opportunity_id))
      )
    )
  )
  WITH CHECK (
    public.is_active_collaborator()
    AND (
      public.is_manager_or_direction()
      OR (
        NOT public.has_private_business_category('mission', id)
        AND (client_id IS NULL OR public.can_access_client(client_id))
        AND (opportunity_id IS NULL OR public.can_access_opportunity(opportunity_id))
      )
    )
  );

DROP POLICY IF EXISTS "opportunity_select_active" ON public.opportunity;
DROP POLICY IF EXISTS "opportunity_update_active" ON public.opportunity;
DROP POLICY IF EXISTS "opportunity_insert_active" ON public.opportunity;

CREATE POLICY "opportunity_insert_active" ON public.opportunity
  FOR INSERT WITH CHECK (
    public.is_active_collaborator()
    AND public.can_access_client(client_id)
  );

CREATE POLICY "opportunity_select_active" ON public.opportunity
  FOR SELECT USING (
    public.is_active_collaborator()
    AND (
      public.is_manager_or_direction()
      OR (
        NOT public.has_private_business_category('opportunity', id)
        AND public.can_access_client(client_id)
      )
    )
  );

CREATE POLICY "opportunity_update_active" ON public.opportunity
  FOR UPDATE
  USING (
    public.is_active_collaborator()
    AND (
      public.is_manager_or_direction()
      OR (
        NOT public.has_private_business_category('opportunity', id)
        AND public.can_access_client(client_id)
      )
    )
  )
  WITH CHECK (
    public.is_active_collaborator()
    AND (
      public.is_manager_or_direction()
      OR (
        NOT public.has_private_business_category('opportunity', id)
        AND public.can_access_client(client_id)
      )
    )
  );
