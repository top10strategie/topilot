-- Cartes/Tableau : end_at / closed_at DESC NULLS FIRST (sans date en tête).

-- Tri Cartes/Tableau : missions par end_at DESC, opportunités par closed_at DESC
-- (NULLS FIRST on end_at/closed_at, tie-break created_at). Kanban board : conserve created_at DESC.

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
  v_retention_from date :=
    ((now() AT TIME ZONE 'Europe/Paris')::date - interval '1 month')::date;
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
        m.kanban_status::text NOT IN ('terminee', 'archivee')
        OR (
          NOT v_board
          AND cardinality(v_statuses) > 0
          AND m.kanban_status::text = ANY (v_statuses)
        )
        OR (
          CASE
            WHEN m.kanban_status = 'archivee' THEN
              coalesce(m.archived_at::date, m.end_at)
            WHEN m.kanban_status = 'terminee' THEN
              coalesce(m.completed_at::date, m.end_at)
            ELSE NULL
          END
        ) >= v_retention_from
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
  ORDER BY
    CASE WHEN v_board THEN c.created_at END DESC NULLS LAST,
    CASE WHEN NOT v_board THEN c.end_at END DESC NULLS FIRST,
    c.created_at DESC
  LIMIT CASE WHEN v_board THEN 200 ELSE v_page_size END
  OFFSET CASE WHEN v_board THEN 0 ELSE v_offset END;
END;
$$;

REVOKE ALL ON FUNCTION public.list_missions_page(
  integer, integer, boolean, uuid, uuid, uuid, uuid[], text, text[], date, date, date, date, text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.list_missions_page(
  integer, integer, boolean, uuid, uuid, uuid, uuid[], text, text[], date, date, date, date, text
) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_opportunities_page(
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 24,
  p_board boolean DEFAULT false,
  p_client_id uuid DEFAULT NULL,
  p_responsible_id uuid DEFAULT NULL,
  p_team_id uuid DEFAULT NULL,
  p_category_ids uuid[] DEFAULT NULL,
  p_statuses text[] DEFAULT NULL,
  p_priority text DEFAULT NULL,
  p_amount_bucket text DEFAULT NULL,
  p_probability_bucket text DEFAULT NULL,
  p_include_archived boolean DEFAULT false,
  p_query text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  opportunity_name text,
  client_id uuid,
  contact_client_id uuid,
  collaborator_id uuid,
  price numeric,
  probability_confirmation numeric,
  average_price numeric,
  entry_average_price numeric,
  kanban_status public.opportunity_kanban_status_enum,
  kanban_order integer,
  is_active boolean,
  priority public.opportunity_priority_enum,
  due_date_at date,
  end_at date,
  closed_at date,
  invoice_frequency public.opportunity_invoice_frequency_enum,
  client_name text,
  contact_first_name text,
  contact_last_name text,
  responsible_first_name text,
  responsible_last_name text,
  profile_picture_file_path text,
  profile_picture_is_visual boolean,
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
  v_include_archived boolean := coalesce(p_include_archived, false);
  v_query text := nullif(trim(p_query), '');
  v_query_pattern text;
  v_category_ids uuid[] := coalesce(p_category_ids, ARRAY[]::uuid[]);
  v_statuses text[] := coalesce(p_statuses, ARRAY[]::text[]);
  v_priority text := nullif(trim(p_priority), '');
  v_amount_bucket text := nullif(trim(p_amount_bucket), '');
  v_probability_bucket text := nullif(trim(p_probability_bucket), '');
  v_retention_from date :=
    ((now() AT TIME ZONE 'Europe/Paris')::date - interval '1 month')::date;
BEGIN
  IF v_priority IS NOT NULL
     AND v_priority NOT IN ('faible', 'normal', 'urgente', 'prioritaire') THEN
    v_priority := NULL;
  END IF;

  IF v_amount_bucket IS NOT NULL
     AND v_amount_bucket NOT IN ('all', 'lt5k', '5to20k', 'gt20k') THEN
    v_amount_bucket := NULL;
  END IF;
  IF v_amount_bucket = 'all' THEN
    v_amount_bucket := NULL;
  END IF;

  IF v_probability_bucket IS NOT NULL
     AND v_probability_bucket NOT IN ('all', 'lt30', '30to50', 'gt50') THEN
    v_probability_bucket := NULL;
  END IF;
  IF v_probability_bucket = 'all' THEN
    v_probability_bucket := NULL;
  END IF;

  v_offset := (v_page - 1) * v_page_size;
  IF v_query IS NOT NULL THEN
    v_query_pattern := '%' || lower(v_query) || '%';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT
      o.id,
      o.opportunity_name,
      o.client_id,
      o.contact_client_id,
      o.collaborator_id,
      o.price,
      o.probability_confirmation,
      o.average_price,
      o.entry_average_price,
      o.kanban_status,
      o.kanban_order,
      o.is_active,
      o.priority,
      o.due_date_at,
      o.end_at,
      o.closed_at,
      o.invoice_frequency,
      c.client_name,
      cc.first_name AS contact_first_name,
      cc.last_name AS contact_last_name,
      col.first_name AS responsible_first_name,
      col.last_name AS responsible_last_name,
      avatar.file_path AS profile_picture_file_path,
      avatar.is_visual AS profile_picture_is_visual,
      o.created_at
    FROM public.opportunity o
    LEFT JOIN public.client c ON c.id = o.client_id
    LEFT JOIN public.contact_client cc ON cc.id = o.contact_client_id
    LEFT JOIN public.collaborator col ON col.id = o.collaborator_id
    LEFT JOIN public.document avatar ON avatar.id = col.profile_picture_id
    WHERE
      (p_client_id IS NULL OR o.client_id = p_client_id)
      AND (p_responsible_id IS NULL OR o.collaborator_id = p_responsible_id)
      AND (p_team_id IS NULL OR col.team_id = p_team_id)
      AND (
        cardinality(v_statuses) = 0
        OR o.kanban_status::text = ANY (v_statuses)
      )
      AND (v_priority IS NULL OR o.priority::text = v_priority)
      AND (
        v_board
        OR o.is_active
        OR v_include_archived
        OR (
          cardinality(v_statuses) > 0
          AND o.kanban_status::text = ANY (v_statuses)
        )
      )
      AND (
        o.kanban_status::text NOT IN ('gagne', 'perdue')
        OR v_include_archived
        OR (
          NOT v_board
          AND cardinality(v_statuses) > 0
          AND o.kanban_status::text = ANY (v_statuses)
        )
        OR coalesce(o.closed_at, o.due_date_at) >= v_retention_from
      )
      AND (
        cardinality(v_category_ids) = 0
        OR (
          SELECT count(DISTINCT link.category_id)
          FROM public.opportunity_category link
          WHERE link.opportunity_id = o.id
            AND link.category_id = ANY (v_category_ids)
        ) = cardinality(v_category_ids)
      )
      AND (
        v_amount_bucket IS NULL
        OR (
          v_amount_bucket = 'lt5k'
          AND coalesce(o.price, 0) < 5000
        )
        OR (
          v_amount_bucket = '5to20k'
          AND coalesce(o.price, 0) >= 5000
          AND coalesce(o.price, 0) <= 20000
        )
        OR (
          v_amount_bucket = 'gt20k'
          AND coalesce(o.price, 0) > 20000
        )
      )
      AND (
        v_probability_bucket IS NULL
        OR (
          v_probability_bucket = 'lt30'
          AND o.probability_confirmation < 30
        )
        OR (
          v_probability_bucket = '30to50'
          AND o.probability_confirmation >= 30
          AND o.probability_confirmation <= 50
        )
        OR (
          v_probability_bucket = 'gt50'
          AND o.probability_confirmation > 50
        )
      )
      AND (
        v_query_pattern IS NULL
        OR lower(o.opportunity_name) LIKE v_query_pattern
        OR lower(coalesce(c.client_name, '')) LIKE v_query_pattern
        OR lower(
          coalesce(col.first_name, '') || ' ' || coalesce(col.last_name, '')
        ) LIKE v_query_pattern
        OR lower(
          CASE o.kanban_status::text
            WHEN 'suspect' THEN 'suspect'
            WHEN 'prospect' THEN 'prospect'
            WHEN 'besoin_specifie' THEN 'besoin spécifié'
            WHEN 'proposition_envoyee' THEN 'proposition envoyée'
            WHEN 'gagne' THEN 'gagné'
            WHEN 'perdue' THEN 'perdu'
            ELSE o.kanban_status::text
          END
        ) LIKE v_query_pattern
        OR lower(
          CASE o.priority::text
            WHEN 'faible' THEN 'faible'
            WHEN 'normal' THEN 'normal'
            WHEN 'urgente' THEN 'urgente'
            WHEN 'prioritaire' THEN 'prioritaire'
            ELSE o.priority::text
          END
        ) LIKE v_query_pattern
        OR EXISTS (
          SELECT 1
          FROM public.opportunity_category link2
          JOIN public.category_business cb2 ON cb2.id = link2.category_id
          WHERE link2.opportunity_id = o.id
            AND lower(cb2.label) LIKE v_query_pattern
        )
      )
  ),
  counted AS (
    SELECT b.*, count(*) OVER () AS total_count
    FROM base b
  ),
  page AS (
    SELECT cnt.*
    FROM counted cnt
    ORDER BY
      CASE WHEN v_board THEN cnt.created_at END DESC NULLS LAST,
      CASE WHEN NOT v_board THEN cnt.closed_at END DESC NULLS FIRST,
      cnt.created_at DESC
    LIMIT CASE WHEN v_board THEN 200 ELSE v_page_size END
    OFFSET CASE WHEN v_board THEN 0 ELSE v_offset END
  )
  SELECT
    p.id,
    p.opportunity_name,
    p.client_id,
    p.contact_client_id,
    p.collaborator_id,
    p.price,
    p.probability_confirmation,
    p.average_price,
    p.entry_average_price,
    p.kanban_status,
    p.kanban_order,
    p.is_active,
    p.priority,
    p.due_date_at,
    p.end_at,
    p.closed_at,
    p.invoice_frequency,
    p.client_name,
    p.contact_first_name,
    p.contact_last_name,
    p.responsible_first_name,
    p.responsible_last_name,
    p.profile_picture_file_path,
    coalesce(p.profile_picture_is_visual, false),
    coalesce(
      (
        SELECT jsonb_agg(
          jsonb_build_object('id', cb.id, 'label', cb.label)
          ORDER BY cb.label
        )
        FROM public.opportunity_category link
        JOIN public.category_business cb ON cb.id = link.category_id
        WHERE link.opportunity_id = p.id
      ),
      '[]'::jsonb
    ),
    p.created_at,
    p.total_count
  FROM page p
  ORDER BY
    CASE WHEN v_board THEN p.created_at END DESC NULLS LAST,
    CASE WHEN NOT v_board THEN p.closed_at END DESC NULLS FIRST,
    p.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.list_opportunities_page(
  integer, integer, boolean, uuid, uuid, uuid, uuid[], text[], text, text, text, boolean, text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.list_opportunities_page(
  integer, integer, boolean, uuid, uuid, uuid, uuid[], text[], text, text, text, boolean, text
) TO authenticated;
