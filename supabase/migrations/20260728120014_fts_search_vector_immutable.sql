-- ============================================================================
-- TOPilot — FTS search_vector (IMMUTABLE) + RPC search_global
-- Notes : to_tsvector(text, text) n'est pas IMMUTABLE → helper fts_french(regconfig).
-- Wiki tags : helper fts_french_tags(text[]).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fts_french(p_text text)
RETURNS tsvector
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT to_tsvector('french'::regconfig, coalesce(p_text, ''));
$$;

CREATE OR REPLACE FUNCTION public.fts_french_tags(p_tags text[])
RETURNS tsvector
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT to_tsvector('french'::regconfig, coalesce(array_to_string(p_tags, ' '), ''));
$$;

ALTER TABLE public.client DROP COLUMN IF EXISTS search_vector;
ALTER TABLE public.client
  ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(public.fts_french(client_name), 'A') ||
    setweight(public.fts_french(notes), 'B')
  ) STORED;
CREATE INDEX IF NOT EXISTS idx_client_search_vector ON public.client USING GIN (search_vector);

ALTER TABLE public.contact_client DROP COLUMN IF EXISTS search_vector;
ALTER TABLE public.contact_client
  ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(public.fts_french(first_name), 'A') ||
    setweight(public.fts_french(last_name), 'A') ||
    setweight(public.fts_french(job_title), 'B') ||
    setweight(public.fts_french(notes), 'C')
  ) STORED;
CREATE INDEX IF NOT EXISTS idx_contact_client_search_vector ON public.contact_client USING GIN (search_vector);

ALTER TABLE public.collaborator DROP COLUMN IF EXISTS search_vector;
ALTER TABLE public.collaborator
  ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(public.fts_french(first_name), 'A') ||
    setweight(public.fts_french(last_name), 'A') ||
    setweight(public.fts_french(job_title), 'B')
  ) STORED;
CREATE INDEX IF NOT EXISTS idx_collaborator_search_vector ON public.collaborator USING GIN (search_vector);

ALTER TABLE public.team DROP COLUMN IF EXISTS search_vector;
ALTER TABLE public.team
  ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(public.fts_french(team_name), 'A') ||
    setweight(public.fts_french(notes), 'B')
  ) STORED;
CREATE INDEX IF NOT EXISTS idx_team_search_vector ON public.team USING GIN (search_vector);

ALTER TABLE public.opportunity DROP COLUMN IF EXISTS search_vector;
ALTER TABLE public.opportunity
  ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(public.fts_french(opportunity_name), 'A') ||
    setweight(public.fts_french(notes), 'B')
  ) STORED;
CREATE INDEX IF NOT EXISTS idx_opportunity_search_vector ON public.opportunity USING GIN (search_vector);

ALTER TABLE public.mission DROP COLUMN IF EXISTS search_vector;
ALTER TABLE public.mission
  ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(public.fts_french(mission_name), 'A') ||
    setweight(public.fts_french(notes), 'B')
  ) STORED;
CREATE INDEX IF NOT EXISTS idx_mission_search_vector ON public.mission USING GIN (search_vector);

ALTER TABLE public.tool DROP COLUMN IF EXISTS search_vector;
ALTER TABLE public.tool
  ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(public.fts_french(tool_name), 'A') ||
    setweight(public.fts_french(description), 'B')
  ) STORED;
CREATE INDEX IF NOT EXISTS idx_tool_search_vector ON public.tool USING GIN (search_vector);

ALTER TABLE public.tool_access DROP COLUMN IF EXISTS search_vector;
ALTER TABLE public.tool_access
  ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(public.fts_french(label), 'A') ||
    setweight(public.fts_french(identifier), 'B')
  ) STORED;
CREATE INDEX IF NOT EXISTS idx_tool_access_search_vector ON public.tool_access USING GIN (search_vector);

ALTER TABLE public.document DROP COLUMN IF EXISTS search_vector;
ALTER TABLE public.document
  ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(public.fts_french(document_name), 'A')
  ) STORED;
CREATE INDEX IF NOT EXISTS idx_document_search_vector ON public.document USING GIN (search_vector);

ALTER TABLE public.wiki DROP COLUMN IF EXISTS search_vector;
ALTER TABLE public.wiki
  ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(public.fts_french(title), 'A') ||
    setweight(public.fts_french(content_text), 'B') ||
    setweight(public.fts_french_tags(tags), 'C')
  ) STORED;
CREATE INDEX IF NOT EXISTS idx_wiki_search_vector ON public.wiki USING GIN (search_vector);

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
BEGIN
  IF p_query IS NULL OR length(trim(p_query)) < 2 THEN
    RETURN;
  END IF;

  v_tsquery := websearch_to_tsquery('french'::regconfig, trim(p_query));
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
GRANT EXECUTE ON FUNCTION public.fts_french(text) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.fts_french_tags(text[]) TO authenticated, anon, service_role;
