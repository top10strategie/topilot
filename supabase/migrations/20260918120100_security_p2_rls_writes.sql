-- ============================================================================
-- TOPilot — Sécurité P2 : tool_access INSERT, jonctions, contact_client, search_global
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Helper : lier une catégorie métier (privée = Manager/Direction uniquement)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.can_link_business_category(p_category_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_active_collaborator()
    AND (
      public.is_manager_or_direction()
      OR EXISTS (
        SELECT 1
        FROM public.category_business cb
        WHERE cb.id = p_category_id
          AND cb.is_private = false
      )
    );
$$;

REVOKE ALL ON FUNCTION public.can_link_business_category(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_link_business_category(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- tool_access : INSERT is_private réservé Manager/Direction + trigger INSERT
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "tool_access_insert_active" ON public.tool_access;

CREATE POLICY "tool_access_insert_active" ON public.tool_access
  FOR INSERT WITH CHECK (
    public.is_active_collaborator()
    AND (
      is_private = false
      OR public.is_manager_or_direction()
    )
  );

CREATE OR REPLACE FUNCTION public.enforce_tool_access_privacy_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_private = true
       AND public.current_collaborator_role() NOT IN ('manager', 'direction') THEN
      RAISE EXCEPTION
        'Seuls un Manager ou la Direction peuvent créer un accès outil privé.';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.is_private IS DISTINCT FROM OLD.is_private
     AND public.current_collaborator_role() NOT IN ('manager', 'direction') THEN
    RAISE EXCEPTION
      'Seuls un Manager ou la Direction peuvent modifier la visibilité d''un accès outil.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_tool_access_privacy_change ON public.tool_access;
CREATE TRIGGER trg_enforce_tool_access_privacy_change
  BEFORE INSERT OR UPDATE ON public.tool_access
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_tool_access_privacy_change();

-- ---------------------------------------------------------------------------
-- contact_client INSERT aligné sur can_access_client
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "contact_client_insert_active" ON public.contact_client;

CREATE POLICY "contact_client_insert_active" ON public.contact_client
  FOR INSERT WITH CHECK (public.can_access_client(client_id));

-- ---------------------------------------------------------------------------
-- Jonctions M2M : INSERT / UPDATE / DELETE alignés sur can_access_*
-- ---------------------------------------------------------------------------

-- client_*
DROP POLICY IF EXISTS "client_category_insert_active" ON public.client_category;
DROP POLICY IF EXISTS "client_category_update_active" ON public.client_category;
DROP POLICY IF EXISTS "client_category_delete_active" ON public.client_category;
CREATE POLICY "client_category_insert_active" ON public.client_category
  FOR INSERT WITH CHECK (
    public.can_access_client(client_id)
    AND public.can_link_business_category(category_id)
  );
CREATE POLICY "client_category_update_active" ON public.client_category
  FOR UPDATE USING (
    public.can_access_client(client_id)
    AND public.can_link_business_category(category_id)
  ) WITH CHECK (
    public.can_access_client(client_id)
    AND public.can_link_business_category(category_id)
  );
CREATE POLICY "client_category_delete_active" ON public.client_category
  FOR DELETE USING (public.can_access_client(client_id));

DROP POLICY IF EXISTS "client_document_insert_active" ON public.client_document;
DROP POLICY IF EXISTS "client_document_update_active" ON public.client_document;
DROP POLICY IF EXISTS "client_document_delete_active" ON public.client_document;
CREATE POLICY "client_document_insert_active" ON public.client_document
  FOR INSERT WITH CHECK (
    public.can_access_client(client_id)
    AND public.can_access_document(document_id)
  );
CREATE POLICY "client_document_update_active" ON public.client_document
  FOR UPDATE USING (
    public.can_access_client(client_id)
    AND public.can_access_document(document_id)
  ) WITH CHECK (
    public.can_access_client(client_id)
    AND public.can_access_document(document_id)
  );
CREATE POLICY "client_document_delete_active" ON public.client_document
  FOR DELETE USING (public.can_access_client(client_id));

DROP POLICY IF EXISTS "client_tool_insert_active" ON public.client_tool;
DROP POLICY IF EXISTS "client_tool_update_active" ON public.client_tool;
DROP POLICY IF EXISTS "client_tool_delete_active" ON public.client_tool;
CREATE POLICY "client_tool_insert_active" ON public.client_tool
  FOR INSERT WITH CHECK (public.can_access_client(client_id));
CREATE POLICY "client_tool_update_active" ON public.client_tool
  FOR UPDATE USING (public.can_access_client(client_id))
  WITH CHECK (public.can_access_client(client_id));
CREATE POLICY "client_tool_delete_active" ON public.client_tool
  FOR DELETE USING (public.can_access_client(client_id));

DROP POLICY IF EXISTS "client_wiki_insert_active" ON public.client_wiki;
DROP POLICY IF EXISTS "client_wiki_update_active" ON public.client_wiki;
DROP POLICY IF EXISTS "client_wiki_delete_active" ON public.client_wiki;
CREATE POLICY "client_wiki_insert_active" ON public.client_wiki
  FOR INSERT WITH CHECK (public.can_access_client(client_id));
CREATE POLICY "client_wiki_update_active" ON public.client_wiki
  FOR UPDATE USING (public.can_access_client(client_id))
  WITH CHECK (public.can_access_client(client_id));
CREATE POLICY "client_wiki_delete_active" ON public.client_wiki
  FOR DELETE USING (public.can_access_client(client_id));

-- mission_*
DROP POLICY IF EXISTS "mission_category_insert_active" ON public.mission_category;
DROP POLICY IF EXISTS "mission_category_update_active" ON public.mission_category;
DROP POLICY IF EXISTS "mission_category_delete_active" ON public.mission_category;
CREATE POLICY "mission_category_insert_active" ON public.mission_category
  FOR INSERT WITH CHECK (
    public.can_access_mission(mission_id)
    AND public.can_link_business_category(category_id)
  );
CREATE POLICY "mission_category_update_active" ON public.mission_category
  FOR UPDATE USING (
    public.can_access_mission(mission_id)
    AND public.can_link_business_category(category_id)
  ) WITH CHECK (
    public.can_access_mission(mission_id)
    AND public.can_link_business_category(category_id)
  );
CREATE POLICY "mission_category_delete_active" ON public.mission_category
  FOR DELETE USING (public.can_access_mission(mission_id));

DROP POLICY IF EXISTS "mission_document_insert_active" ON public.mission_document;
DROP POLICY IF EXISTS "mission_document_update_active" ON public.mission_document;
DROP POLICY IF EXISTS "mission_document_delete_active" ON public.mission_document;
CREATE POLICY "mission_document_insert_active" ON public.mission_document
  FOR INSERT WITH CHECK (
    public.can_access_mission(mission_id)
    AND public.can_access_document(document_id)
  );
CREATE POLICY "mission_document_update_active" ON public.mission_document
  FOR UPDATE USING (
    public.can_access_mission(mission_id)
    AND public.can_access_document(document_id)
  ) WITH CHECK (
    public.can_access_mission(mission_id)
    AND public.can_access_document(document_id)
  );
CREATE POLICY "mission_document_delete_active" ON public.mission_document
  FOR DELETE USING (public.can_access_mission(mission_id));

DROP POLICY IF EXISTS "mission_tool_insert_active" ON public.mission_tool;
DROP POLICY IF EXISTS "mission_tool_update_active" ON public.mission_tool;
DROP POLICY IF EXISTS "mission_tool_delete_active" ON public.mission_tool;
CREATE POLICY "mission_tool_insert_active" ON public.mission_tool
  FOR INSERT WITH CHECK (public.can_access_mission(mission_id));
CREATE POLICY "mission_tool_update_active" ON public.mission_tool
  FOR UPDATE USING (public.can_access_mission(mission_id))
  WITH CHECK (public.can_access_mission(mission_id));
CREATE POLICY "mission_tool_delete_active" ON public.mission_tool
  FOR DELETE USING (public.can_access_mission(mission_id));

DROP POLICY IF EXISTS "mission_wiki_insert_active" ON public.mission_wiki;
DROP POLICY IF EXISTS "mission_wiki_update_active" ON public.mission_wiki;
DROP POLICY IF EXISTS "mission_wiki_delete_active" ON public.mission_wiki;
CREATE POLICY "mission_wiki_insert_active" ON public.mission_wiki
  FOR INSERT WITH CHECK (public.can_access_mission(mission_id));
CREATE POLICY "mission_wiki_update_active" ON public.mission_wiki
  FOR UPDATE USING (public.can_access_mission(mission_id))
  WITH CHECK (public.can_access_mission(mission_id));
CREATE POLICY "mission_wiki_delete_active" ON public.mission_wiki
  FOR DELETE USING (public.can_access_mission(mission_id));

-- opportunity_*
DROP POLICY IF EXISTS "opportunity_category_insert_active" ON public.opportunity_category;
DROP POLICY IF EXISTS "opportunity_category_update_active" ON public.opportunity_category;
DROP POLICY IF EXISTS "opportunity_category_delete_active" ON public.opportunity_category;
CREATE POLICY "opportunity_category_insert_active" ON public.opportunity_category
  FOR INSERT WITH CHECK (
    public.can_access_opportunity(opportunity_id)
    AND public.can_link_business_category(category_id)
  );
CREATE POLICY "opportunity_category_update_active" ON public.opportunity_category
  FOR UPDATE USING (
    public.can_access_opportunity(opportunity_id)
    AND public.can_link_business_category(category_id)
  ) WITH CHECK (
    public.can_access_opportunity(opportunity_id)
    AND public.can_link_business_category(category_id)
  );
CREATE POLICY "opportunity_category_delete_active" ON public.opportunity_category
  FOR DELETE USING (public.can_access_opportunity(opportunity_id));

DROP POLICY IF EXISTS "opportunity_document_insert_active" ON public.opportunity_document;
DROP POLICY IF EXISTS "opportunity_document_update_active" ON public.opportunity_document;
DROP POLICY IF EXISTS "opportunity_document_delete_active" ON public.opportunity_document;
CREATE POLICY "opportunity_document_insert_active" ON public.opportunity_document
  FOR INSERT WITH CHECK (
    public.can_access_opportunity(opportunity_id)
    AND public.can_access_document(document_id)
  );
CREATE POLICY "opportunity_document_update_active" ON public.opportunity_document
  FOR UPDATE USING (
    public.can_access_opportunity(opportunity_id)
    AND public.can_access_document(document_id)
  ) WITH CHECK (
    public.can_access_opportunity(opportunity_id)
    AND public.can_access_document(document_id)
  );
CREATE POLICY "opportunity_document_delete_active" ON public.opportunity_document
  FOR DELETE USING (public.can_access_opportunity(opportunity_id));

DROP POLICY IF EXISTS "opportunity_tool_insert_active" ON public.opportunity_tool;
DROP POLICY IF EXISTS "opportunity_tool_update_active" ON public.opportunity_tool;
DROP POLICY IF EXISTS "opportunity_tool_delete_active" ON public.opportunity_tool;
CREATE POLICY "opportunity_tool_insert_active" ON public.opportunity_tool
  FOR INSERT WITH CHECK (public.can_access_opportunity(opportunity_id));
CREATE POLICY "opportunity_tool_update_active" ON public.opportunity_tool
  FOR UPDATE USING (public.can_access_opportunity(opportunity_id))
  WITH CHECK (public.can_access_opportunity(opportunity_id));
CREATE POLICY "opportunity_tool_delete_active" ON public.opportunity_tool
  FOR DELETE USING (public.can_access_opportunity(opportunity_id));

-- team_category
DROP POLICY IF EXISTS "team_category_insert_active" ON public.team_category;
DROP POLICY IF EXISTS "team_category_update_active" ON public.team_category;
DROP POLICY IF EXISTS "team_category_delete_active" ON public.team_category;
CREATE POLICY "team_category_insert_active" ON public.team_category
  FOR INSERT WITH CHECK (
    public.can_access_team(team_id)
    AND public.can_link_business_category(category_id)
  );
CREATE POLICY "team_category_update_active" ON public.team_category
  FOR UPDATE USING (
    public.can_access_team(team_id)
    AND public.can_link_business_category(category_id)
  ) WITH CHECK (
    public.can_access_team(team_id)
    AND public.can_link_business_category(category_id)
  );
CREATE POLICY "team_category_delete_active" ON public.team_category
  FOR DELETE USING (public.can_access_team(team_id));

-- tool_category / wiki_category : pas de parent can_access_* métier privé ;
-- restent ouverts aux actifs (SELECT déjà is_active).
-- (inchangé intentionnellement)

-- ---------------------------------------------------------------------------
-- search_global : refuse les comptes Auth non actifs
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.search_global(
  p_query text,
  p_limit integer DEFAULT 20
)
RETURNS TABLE(
  entity_type text,
  entity_id uuid,
  title text,
  subtitle text,
  rank real
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tsquery tsquery;
  v_limit integer := GREATEST(1, LEAST(COALESCE(p_limit, 20), 50));
  v_can_see_private boolean := public.is_manager_or_direction();
  v_words text[];
  v_prefix_query text;
BEGIN
  IF NOT public.is_active_collaborator() THEN
    RETURN;
  END IF;

  IF p_query IS NULL OR btrim(p_query) = '' THEN
    RETURN;
  END IF;

  v_words := regexp_split_to_array(btrim(p_query), '\s+');
  v_prefix_query := array_to_string(
    ARRAY(
      SELECT word || ':*'
      FROM unnest(v_words) AS word
      WHERE word <> ''
    ),
    ' & '
  );

  IF v_prefix_query IS NULL OR v_prefix_query = '' THEN
    RETURN;
  END IF;

  BEGIN
    v_tsquery := to_tsquery('french', v_prefix_query);
  EXCEPTION
    WHEN OTHERS THEN
      RETURN;
  END;

  RETURN QUERY
  (
    SELECT 'client'::text, c.id, c.client_name,
           CASE WHEN c.is_active THEN 'Client actif' ELSE 'Client inactif' END,
           ts_rank(c.search_vector, v_tsquery)
    FROM public.client c
    WHERE c.search_vector @@ v_tsquery
      AND (v_can_see_private OR NOT public.has_private_business_category('client', c.id))

    UNION ALL

    SELECT 'contact_client', cc.client_id,
           trim(both FROM cc.first_name || ' ' || cc.last_name),
           coalesce(cl.client_name, coalesce(cc.job_title, 'Contact client')),
           ts_rank(cc.search_vector, v_tsquery)
    FROM public.contact_client cc
    LEFT JOIN public.client cl ON cl.id = cc.client_id
    WHERE cc.search_vector @@ v_tsquery
      AND (v_can_see_private OR NOT public.has_private_business_category('client', cc.client_id))

    UNION ALL

    SELECT 'collaborator', col.id,
           trim(both FROM col.first_name || ' ' || col.last_name),
           col.job_title,
           ts_rank(col.search_vector, v_tsquery)
    FROM public.collaborator col
    WHERE col.status = 'actif'
      AND col.search_vector @@ v_tsquery

    UNION ALL

    SELECT 'team', t.id, t.team_name, 'Pole'::text,
           ts_rank(t.search_vector, v_tsquery)
    FROM public.team t
    WHERE t.search_vector @@ v_tsquery
      AND (v_can_see_private OR NOT public.has_private_business_category('team', t.id))

    UNION ALL

    SELECT 'opportunity', o.id, o.opportunity_name, 'Opportunite'::text,
           ts_rank(o.search_vector, v_tsquery)
    FROM public.opportunity o
    WHERE o.search_vector @@ v_tsquery
      AND (
        v_can_see_private
        OR (
          NOT public.has_private_business_category('opportunity', o.id)
          AND NOT public.has_private_business_category('client', o.client_id)
        )
      )

    UNION ALL

    SELECT 'mission', m.id, m.mission_name, 'Mission'::text,
           ts_rank(m.search_vector, v_tsquery)
    FROM public.mission m
    WHERE m.search_vector @@ v_tsquery
      AND (
        v_can_see_private
        OR (
          NOT public.has_private_business_category('mission', m.id)
          AND (m.client_id IS NULL OR NOT public.has_private_business_category('client', m.client_id))
          AND (
            m.opportunity_id IS NULL
            OR (
              NOT public.has_private_business_category('opportunity', m.opportunity_id)
              AND EXISTS (
                SELECT 1 FROM public.opportunity ox
                WHERE ox.id = m.opportunity_id
                  AND NOT public.has_private_business_category('client', ox.client_id)
              )
            )
          )
        )
      )

    UNION ALL

    SELECT 'tool', tl.id, tl.tool_name, coalesce(tl.description, 'Outil'),
           ts_rank(tl.search_vector, v_tsquery)
    FROM public.tool tl
    WHERE tl.search_vector @@ v_tsquery

    UNION ALL

    SELECT 'tool_access', ta.id, ta.label, ta.identifier,
           ts_rank(ta.search_vector, v_tsquery)
    FROM public.tool_access ta
    WHERE ta.search_vector @@ v_tsquery
      AND (ta.is_private = false OR v_can_see_private)

    UNION ALL

    SELECT 'document', d.id, d.document_name, 'Document'::text,
           ts_rank(d.search_vector, v_tsquery)
    FROM public.document d
    WHERE d.search_vector @@ v_tsquery
      AND public.can_access_document(d.id)

    UNION ALL

    SELECT 'wiki', w.id, w.title, 'Wiki'::text,
           ts_rank(w.search_vector, v_tsquery)
    FROM public.wiki w
    WHERE w.search_vector @@ v_tsquery
  )
  ORDER BY 5 DESC
  LIMIT v_limit;
END;
$function$;
