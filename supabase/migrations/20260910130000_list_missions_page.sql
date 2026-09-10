-- ============================================================================
-- TOPilot — Pagination serveur /missions (filtres alignés UI + mode board)
-- SECURITY INVOKER : RLS mission / jointures appliquées.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.list_missions_page(
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 24,
  p_board boolean DEFAULT false,
  p_client_id uuid DEFAULT NULL,
  p_responsible_id uuid DEFAULT NULL,
  p_team_id uuid DEFAULT NULL,
  p_category_ids uuid[] DEFAULT NULL,
  p_scope text DEFAULT NULL,
  p_statuses text[] DEFAULT NULL,
  p_start_from date DEFAULT NULL,
  p_start_to date DEFAULT NULL,
  p_end_from date DEFAULT NULL,
  p_end_to date DEFAULT NULL,
  p_query text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  mission_name text,
  mission_scope public.mission_scope_enum,
  client_id uuid,
  collaborator_id uuid,
  opportunity_id uuid,
  series_id uuid,
  kanban_status public.mission_kanban_status_enum,
  kanban_order integer,
  archived_at timestamptz,
  completed_at timestamptz,
  estimated_charge numeric,
  start_at date,
  end_at date,
  client_name text,
  opportunity_name text,
  responsible_first_name text,
  responsible_last_name text,
  profile_picture_file_path text,
  profile_picture_is_visual boolean,
  series_frequency public.mission_recurrence_frequency,
  series_starts_on date,
  series_ends_on date,
  categories jsonb,
  created_at timestamptz,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_page integer := GREATEST(1, coalesce(p_page, 1));
  v_page_size integer := GREATEST(1, LEAST(coalesce(p_page_size, 24), 100));
  v_offset integer;
  v_board boolean := coalesce(p_board, false);
  v_query text := nullif(trim(p_query), '');
  v_query_pattern text;
  v_category_ids uuid[] := coalesce(p_category_ids, ARRAY[]::uuid[]);
  v_statuses text[] := coalesce(p_statuses, ARRAY[]::text[]);
  v_scope text := nullif(trim(p_scope), '');
BEGIN
  IF v_scope IS NOT NULL AND v_scope NOT IN ('client', 'interne') THEN
    v_scope := NULL;
  END IF;

  v_offset := (v_page - 1) * v_page_size;
  IF v_query IS NOT NULL THEN
    v_query_pattern := '%' || lower(v_query) || '%';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT
      m.id,
      m.mission_name,
      m.mission_scope,
      m.client_id,
      m.collaborator_id,
      m.opportunity_id,
      m.series_id,
      m.kanban_status,
      m.kanban_order,
      m.archived_at,
      m.completed_at,
      m.estimated_charge,
      m.start_at,
      m.end_at,
      c.client_name,
      o.opportunity_name,
      col.first_name AS responsible_first_name,
      col.last_name AS responsible_last_name,
      avatar.file_path AS profile_picture_file_path,
      avatar.is_visual AS profile_picture_is_visual,
      s.frequency AS series_frequency,
      s.starts_on AS series_starts_on,
      s.ends_on AS series_ends_on,
      coalesce(
        (
          SELECT jsonb_agg(
            jsonb_build_object('id', cb.id, 'label', cb.label)
            ORDER BY cb.label
          )
          FROM public.mission_category link
          JOIN public.category_business cb ON cb.id = link.category_id
          WHERE link.mission_id = m.id
        ),
        '[]'::jsonb
      ) AS categories,
      m.created_at
    FROM public.mission m
    LEFT JOIN public.client c ON c.id = m.client_id
    LEFT JOIN public.opportunity o ON o.id = m.opportunity_id
    LEFT JOIN public.collaborator col ON col.id = m.collaborator_id
    LEFT JOIN public.document avatar ON avatar.id = col.profile_picture_id
    LEFT JOIN public.mission_series s ON s.id = m.series_id
    WHERE
      (p_client_id IS NULL OR m.client_id = p_client_id)
      AND (p_responsible_id IS NULL OR m.collaborator_id = p_responsible_id)
      AND (p_team_id IS NULL OR col.team_id = p_team_id)
      AND (v_scope IS NULL OR m.mission_scope::text = v_scope)
      AND (
        cardinality(v_statuses) = 0
        OR m.kanban_status::text = ANY (v_statuses)
      )
      AND (
        cardinality(v_category_ids) = 0
        OR EXISTS (
          SELECT 1
          FROM public.mission_category link
          WHERE link.mission_id = m.id
            AND link.category_id = ANY (v_category_ids)
        )
      )
      AND (
        (p_start_from IS NULL AND p_start_to IS NULL)
        OR (
          m.start_at IS NOT NULL
          AND (p_start_from IS NULL OR m.start_at >= p_start_from)
          AND (p_start_to IS NULL OR m.start_at <= p_start_to)
        )
      )
      AND (
        (p_end_from IS NULL AND p_end_to IS NULL)
        OR (
          m.end_at IS NOT NULL
          AND (p_end_from IS NULL OR m.end_at >= p_end_from)
          AND (p_end_to IS NULL OR m.end_at <= p_end_to)
        )
      )
      AND (
        v_query_pattern IS NULL
        OR lower(m.mission_name) LIKE v_query_pattern
        OR lower(coalesce(c.client_name, '')) LIKE v_query_pattern
        OR lower(coalesce(o.opportunity_name, '')) LIKE v_query_pattern
        OR lower(
          coalesce(col.first_name, '') || ' ' || coalesce(col.last_name, '')
        ) LIKE v_query_pattern
        OR lower(
          CASE m.kanban_status::text
            WHEN 'a_faire' THEN 'à faire'
            WHEN 'en_cours' THEN 'en cours'
            WHEN 'terminee' THEN 'terminé'
            WHEN 'archivee' THEN 'archivé'
            ELSE m.kanban_status::text
          END
        ) LIKE v_query_pattern
        OR lower(
          CASE m.mission_scope::text
            WHEN 'client' THEN 'client'
            WHEN 'interne' THEN 'interne'
            ELSE m.mission_scope::text
          END
        ) LIKE v_query_pattern
        OR EXISTS (
          SELECT 1
          FROM public.mission_category link2
          JOIN public.category_business cb2 ON cb2.id = link2.category_id
          WHERE link2.mission_id = m.id
            AND lower(cb2.label) LIKE v_query_pattern
        )
      )
  ),
  counted AS (
    SELECT b.*, count(*) OVER () AS total_count
    FROM base b
  )
  SELECT
    c.id,
    c.mission_name,
    c.mission_scope,
    c.client_id,
    c.collaborator_id,
    c.opportunity_id,
    c.series_id,
    c.kanban_status,
    c.kanban_order,
    c.archived_at,
    c.completed_at,
    c.estimated_charge,
    c.start_at,
    c.end_at,
    c.client_name,
    c.opportunity_name,
    c.responsible_first_name,
    c.responsible_last_name,
    c.profile_picture_file_path,
    coalesce(c.profile_picture_is_visual, false),
    c.series_frequency,
    c.series_starts_on,
    c.series_ends_on,
    c.categories,
    c.created_at,
    c.total_count
  FROM counted c
  ORDER BY c.created_at DESC
  LIMIT CASE WHEN v_board THEN NULL ELSE v_page_size END
  OFFSET CASE WHEN v_board THEN 0 ELSE v_offset END;
END;
$$;

REVOKE ALL ON FUNCTION public.list_missions_page(
  integer, integer, boolean, uuid, uuid, uuid, uuid[], text, text[], date, date, date, date, text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.list_missions_page(
  integer, integer, boolean, uuid, uuid, uuid, uuid[], text, text[], date, date, date, date, text
) TO authenticated;
