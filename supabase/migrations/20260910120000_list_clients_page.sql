-- ============================================================================
-- TOPilot — Pagination serveur /clients (filtres alignés UI)
-- SECURITY INVOKER : RLS client / jointures appliquées.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.list_clients_page(
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 24,
  p_status text DEFAULT 'active',
  p_responsible_id uuid DEFAULT NULL,
  p_team_id uuid DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_category_ids uuid[] DEFAULT NULL,
  p_mission_bucket text DEFAULT 'all',
  p_query text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  client_name text,
  website text,
  address_city text,
  is_active boolean,
  facilitator boolean,
  logo_file_path text,
  logo_is_visual boolean,
  responsible_id uuid,
  responsible_first_name text,
  responsible_last_name text,
  main_contact_id uuid,
  main_contact_first_name text,
  main_contact_last_name text,
  main_contact_phone text,
  main_contact_email text,
  categories jsonb,
  mission_count bigint,
  opportunity_count bigint,
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
  v_status text := coalesce(nullif(trim(p_status), ''), 'active');
  v_bucket text := coalesce(nullif(trim(p_mission_bucket), ''), 'all');
  v_city text := nullif(trim(p_city), '');
  v_query text := nullif(trim(p_query), '');
  v_query_pattern text;
  v_category_ids uuid[] := coalesce(p_category_ids, ARRAY[]::uuid[]);
BEGIN
  IF v_status NOT IN ('active', 'inactive', 'all') THEN
    v_status := 'active';
  END IF;
  IF v_bucket NOT IN ('all', 'lt5', '5to20', 'gt20') THEN
    v_bucket := 'all';
  END IF;

  v_offset := (v_page - 1) * v_page_size;
  IF v_query IS NOT NULL THEN
    v_query_pattern := '%' || lower(v_query) || '%';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT
      c.id,
      c.client_name,
      c.website,
      c.address_city,
      c.is_active,
      c.facilitator,
      logo.file_path AS logo_file_path,
      logo.is_visual AS logo_is_visual,
      col.id AS responsible_id,
      col.first_name AS responsible_first_name,
      col.last_name AS responsible_last_name,
      mc.id AS main_contact_id,
      mc.first_name AS main_contact_first_name,
      mc.last_name AS main_contact_last_name,
      mc.phone_number AS main_contact_phone,
      mc.email_address AS main_contact_email,
      coalesce(
        (
          SELECT jsonb_agg(
            jsonb_build_object('id', cb.id, 'label', cb.label)
            ORDER BY cb.label
          )
          FROM public.client_category link
          JOIN public.category_business cb ON cb.id = link.category_id
          WHERE link.client_id = c.id
        ),
        '[]'::jsonb
      ) AS categories,
      (
        SELECT count(*)::bigint
        FROM public.mission m
        WHERE m.client_id = c.id
      ) AS mission_count,
      (
        SELECT count(*)::bigint
        FROM public.opportunity o
        WHERE o.client_id = c.id
      ) AS opportunity_count
    FROM public.client c
    LEFT JOIN public.document logo ON logo.id = c.logo_id
    LEFT JOIN public.collaborator col ON col.id = c.main_collaborator_id
    LEFT JOIN LATERAL (
      SELECT cc.id, cc.first_name, cc.last_name, cc.phone_number, cc.email_address
      FROM public.contact_client cc
      WHERE cc.client_id = c.id AND cc.is_main = true
      ORDER BY cc.created_at ASC
      LIMIT 1
    ) mc ON true
    WHERE
      (v_status = 'all'
        OR (v_status = 'active' AND c.is_active = true)
        OR (v_status = 'inactive' AND c.is_active = false))
      AND (p_responsible_id IS NULL OR c.main_collaborator_id = p_responsible_id)
      AND (p_team_id IS NULL OR col.team_id = p_team_id)
      AND (v_city IS NULL OR c.address_city = v_city)
      AND (
        cardinality(v_category_ids) = 0
        OR (
          SELECT count(DISTINCT link.category_id)
          FROM public.client_category link
          WHERE link.client_id = c.id
            AND link.category_id = ANY (v_category_ids)
        ) = cardinality(v_category_ids)
      )
      AND (
        v_query_pattern IS NULL
        OR lower(c.client_name) LIKE v_query_pattern
        OR lower(coalesce(c.website, '')) LIKE v_query_pattern
        OR lower(coalesce(c.address_city, '')) LIKE v_query_pattern
        OR lower(coalesce(col.first_name, '') || ' ' || coalesce(col.last_name, ''))
          LIKE v_query_pattern
        OR lower(coalesce(mc.first_name, '') || ' ' || coalesce(mc.last_name, ''))
          LIKE v_query_pattern
        OR EXISTS (
          SELECT 1
          FROM public.client_category link2
          JOIN public.category_business cb2 ON cb2.id = link2.category_id
          WHERE link2.client_id = c.id
            AND lower(cb2.label) LIKE v_query_pattern
        )
      )
  ),
  filtered AS (
    SELECT b.*
    FROM base b
    WHERE
      v_bucket = 'all'
      OR (v_bucket = 'lt5' AND b.mission_count < 5)
      OR (v_bucket = '5to20' AND b.mission_count BETWEEN 5 AND 20)
      OR (v_bucket = 'gt20' AND b.mission_count > 20)
  ),
  counted AS (
    SELECT f.*, count(*) OVER () AS total_count
    FROM filtered f
  )
  SELECT
    c.id,
    c.client_name,
    c.website,
    c.address_city,
    c.is_active,
    c.facilitator,
    c.logo_file_path,
    coalesce(c.logo_is_visual, false),
    c.responsible_id,
    c.responsible_first_name,
    c.responsible_last_name,
    c.main_contact_id,
    c.main_contact_first_name,
    c.main_contact_last_name,
    c.main_contact_phone,
    c.main_contact_email,
    c.categories,
    c.mission_count,
    c.opportunity_count,
    c.total_count
  FROM counted c
  ORDER BY c.client_name ASC
  LIMIT v_page_size
  OFFSET v_offset;
END;
$$;

REVOKE ALL ON FUNCTION public.list_clients_page(
  integer, integer, text, uuid, uuid, text, uuid[], text, text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.list_clients_page(
  integer, integer, text, uuid, uuid, text, uuid[], text, text
) TO authenticated;
