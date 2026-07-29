-- ============================================================================
-- TOPilot — Prefixe FTS pour search_global (saisie progressive dans la modale)
-- websearch_to_tsquery exige des lexèmes complets ; la recherche UI tape souvent
-- des préfixes ("mar" → match sur lexèmes french). Tokens → `token:*` en AND.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.search_global(
  p_query text,
  p_limit integer DEFAULT 25
)
RETURNS TABLE (
  entity_type text,
  entity_id uuid,
  title text,
  subtitle text,
  rank real
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_tsquery tsquery;
  v_limit integer := GREATEST(1, LEAST(coalesce(p_limit, 25), 50));
  v_can_see_private boolean;
  v_prefix text;
BEGIN
  IF p_query IS NULL OR length(trim(p_query)) < 2 THEN
    RETURN;
  END IF;

  SELECT string_agg(cleaned || ':*', ' & ' ORDER BY ord)
  INTO v_prefix
  FROM (
    SELECT
      ord,
      regexp_replace(lower(word), '[!&|():*<>''"]+', '', 'g') AS cleaned
    FROM regexp_split_to_table(trim(p_query), '\s+') WITH ORDINALITY AS t(word, ord)
  ) tokens
  WHERE length(cleaned) >= 1;

  IF v_prefix IS NULL OR v_prefix = '' THEN
    RETURN;
  END IF;

  BEGIN
    v_tsquery := to_tsquery('french'::regconfig, v_prefix);
  EXCEPTION
    WHEN OTHERS THEN
      v_tsquery := websearch_to_tsquery('french'::regconfig, trim(p_query));
  END;

  IF v_tsquery IS NULL OR v_tsquery::text = '' THEN
    RETURN;
  END IF;

  v_can_see_private := public.current_collaborator_role() IN ('manager', 'direction');

  RETURN QUERY
  (
    SELECT 'client'::text, c.id, c.client_name,
           CASE WHEN c.is_active THEN 'Client actif' ELSE 'Client inactif' END,
           ts_rank(c.search_vector, v_tsquery)
    FROM public.client c
    WHERE c.search_vector @@ v_tsquery

    UNION ALL

    SELECT 'contact_client', cc.id,
           trim(both FROM cc.first_name || ' ' || cc.last_name),
           coalesce(cc.job_title, 'Contact client'),
           ts_rank(cc.search_vector, v_tsquery)
    FROM public.contact_client cc
    WHERE cc.search_vector @@ v_tsquery

    UNION ALL

    SELECT 'collaborator', col.id,
           trim(both FROM col.first_name || ' ' || col.last_name),
           col.job_title,
           ts_rank(col.search_vector, v_tsquery)
    FROM public.collaborator col
    WHERE col.status = 'actif'
      AND col.search_vector @@ v_tsquery

    UNION ALL

    SELECT 'team', t.id, t.team_name, 'Pôle'::text,
           ts_rank(t.search_vector, v_tsquery)
    FROM public.team t
    WHERE t.search_vector @@ v_tsquery

    UNION ALL

    SELECT 'opportunity', o.id, o.opportunity_name, 'Opportunité'::text,
           ts_rank(o.search_vector, v_tsquery)
    FROM public.opportunity o
    WHERE o.search_vector @@ v_tsquery

    UNION ALL

    SELECT 'mission', m.id, m.mission_name, 'Mission'::text,
           ts_rank(m.search_vector, v_tsquery)
    FROM public.mission m
    WHERE m.search_vector @@ v_tsquery

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

    UNION ALL

    SELECT 'wiki', w.id, w.title, 'Wiki'::text,
           ts_rank(w.search_vector, v_tsquery)
    FROM public.wiki w
    WHERE w.search_vector @@ v_tsquery
  )
  ORDER BY 5 DESC
  LIMIT v_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.search_global(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_global(text, integer) TO authenticated;
