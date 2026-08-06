-- ============================================================================
-- TOPilot — RLS jonctions M2M alignées sur can_access_* des parents
-- SELECT uniquement : INSERT/UPDATE/DELETE restent is_active_collaborator
-- ============================================================================

-- Clients
DROP POLICY IF EXISTS "client_category_select_active" ON public.client_category;
CREATE POLICY "client_category_select_active" ON public.client_category
  FOR SELECT USING (public.can_access_client(client_id));

DROP POLICY IF EXISTS "client_document_select_active" ON public.client_document;
CREATE POLICY "client_document_select_active" ON public.client_document
  FOR SELECT USING (public.can_access_client(client_id));

DROP POLICY IF EXISTS "client_tool_select_active" ON public.client_tool;
CREATE POLICY "client_tool_select_active" ON public.client_tool
  FOR SELECT USING (public.can_access_client(client_id));

DROP POLICY IF EXISTS "client_wiki_select_active" ON public.client_wiki;
CREATE POLICY "client_wiki_select_active" ON public.client_wiki
  FOR SELECT USING (public.can_access_client(client_id));

-- Missions
DROP POLICY IF EXISTS "mission_category_select_active" ON public.mission_category;
CREATE POLICY "mission_category_select_active" ON public.mission_category
  FOR SELECT USING (public.can_access_mission(mission_id));

DROP POLICY IF EXISTS "mission_document_select_active" ON public.mission_document;
CREATE POLICY "mission_document_select_active" ON public.mission_document
  FOR SELECT USING (public.can_access_mission(mission_id));

DROP POLICY IF EXISTS "mission_tool_select_active" ON public.mission_tool;
CREATE POLICY "mission_tool_select_active" ON public.mission_tool
  FOR SELECT USING (public.can_access_mission(mission_id));

DROP POLICY IF EXISTS "mission_wiki_select_active" ON public.mission_wiki;
CREATE POLICY "mission_wiki_select_active" ON public.mission_wiki
  FOR SELECT USING (public.can_access_mission(mission_id));

-- Opportunités
DROP POLICY IF EXISTS "opportunity_category_select_active" ON public.opportunity_category;
CREATE POLICY "opportunity_category_select_active" ON public.opportunity_category
  FOR SELECT USING (public.can_access_opportunity(opportunity_id));

DROP POLICY IF EXISTS "opportunity_document_select_active" ON public.opportunity_document;
CREATE POLICY "opportunity_document_select_active" ON public.opportunity_document
  FOR SELECT USING (public.can_access_opportunity(opportunity_id));

DROP POLICY IF EXISTS "opportunity_tool_select_active" ON public.opportunity_tool;
CREATE POLICY "opportunity_tool_select_active" ON public.opportunity_tool
  FOR SELECT USING (public.can_access_opportunity(opportunity_id));

-- Pôles
DROP POLICY IF EXISTS "team_category_select_active" ON public.team_category;
CREATE POLICY "team_category_select_active" ON public.team_category
  FOR SELECT USING (public.can_access_team(team_id));
