-- Accélère /, /opportunities et /clients :
-- 1. Policies SELECT : le rôle est un InitPlan (une fois par requête).
--    Les règles d'accès ne changent pas (manager/direction voit tout,
--    collaborateur : pas de catégorie privée, client de la ligne courante).
-- 2. list_clients_page / list_opportunities_page : catégories et comptes
--    après LIMIT (le filtre « nombre de missions » calcule encore les comptes avant).
-- 3. load_analyses_payload : agrégats JSON, sans transférer toutes les lignes.

-- ============================================================================
-- A. Policies SELECT
-- ============================================================================

DROP POLICY IF EXISTS "client_select_active" ON public.client;
CREATE POLICY "client_select_active" ON public.client
  FOR SELECT USING (
    (SELECT public.is_active_collaborator())
    AND (
      (SELECT public.is_manager_or_direction())
      OR NOT public.has_private_business_category('client', id)
    )
  );

DROP POLICY IF EXISTS "team_select_active" ON public.team;
CREATE POLICY "team_select_active" ON public.team
  FOR SELECT USING (
    (SELECT public.is_active_collaborator())
    AND (
      (SELECT public.is_manager_or_direction())
      OR NOT public.has_private_business_category('team', id)
    )
  );

DROP POLICY IF EXISTS "contact_client_select_active" ON public.contact_client;
CREATE POLICY "contact_client_select_active" ON public.contact_client
  FOR SELECT USING (
    (SELECT public.is_active_collaborator())
    AND (
      (SELECT public.is_manager_or_direction())
      OR NOT public.has_private_business_category('client', client_id)
    )
  );

DROP POLICY IF EXISTS "opportunity_select_active" ON public.opportunity;
CREATE POLICY "opportunity_select_active" ON public.opportunity
  FOR SELECT USING (
    (SELECT public.is_active_collaborator())
    AND (
      (SELECT public.is_manager_or_direction())
      OR (
        NOT public.has_private_business_category('opportunity', id)
        AND NOT public.has_private_business_category('client', client_id)
      )
    )
  );

-- Le client de l'opportunité liée n'est pas sur la ligne mission :
-- un seul lookup par clé primaire, sans can_access_opportunity (qui relisait
-- le rôle et la ligne).
DROP POLICY IF EXISTS "mission_select_active" ON public.mission;
CREATE POLICY "mission_select_active" ON public.mission
  FOR SELECT USING (
    (SELECT public.is_active_collaborator())
    AND (
      (SELECT public.is_manager_or_direction())
      OR (
        NOT public.has_private_business_category('mission', id)
        AND (
          client_id IS NULL
          OR NOT public.has_private_business_category('client', client_id)
        )
        AND (
          opportunity_id IS NULL
          OR EXISTS (
            SELECT 1
            FROM public.opportunity o
            WHERE o.id = opportunity_id
              AND NOT public.has_private_business_category('opportunity', o.id)
              AND NOT public.has_private_business_category('client', o.client_id)
          )
        )
      )
    )
  );

DROP POLICY IF EXISTS "document_select_active" ON public.document;
CREATE POLICY "document_select_active" ON public.document
  FOR SELECT USING (
    (SELECT public.is_active_collaborator())
    AND (
      (SELECT public.is_manager_or_direction())
      OR (
        NOT EXISTS (
          SELECT 1
          FROM public.client_document cd
          WHERE cd.document_id = id
            AND public.has_private_business_category('client', cd.client_id)
        )
        AND NOT EXISTS (
          SELECT 1
          FROM public.mission_document md
          JOIN public.mission m ON m.id = md.mission_id
          WHERE md.document_id = id
            AND (
              public.has_private_business_category('mission', m.id)
              OR (
                m.client_id IS NOT NULL
                AND public.has_private_business_category('client', m.client_id)
              )
              OR (
                m.opportunity_id IS NOT NULL
                AND EXISTS (
                  SELECT 1
                  FROM public.opportunity o
                  WHERE o.id = m.opportunity_id
                    AND (
                      public.has_private_business_category('opportunity', o.id)
                      OR public.has_private_business_category('client', o.client_id)
                    )
                )
              )
            )
        )
        AND NOT EXISTS (
          SELECT 1
          FROM public.opportunity_document od
          JOIN public.opportunity o ON o.id = od.opportunity_id
          WHERE od.document_id = id
            AND (
              public.has_private_business_category('opportunity', o.id)
              OR public.has_private_business_category('client', o.client_id)
            )
        )
      )
    )
  );

DROP POLICY IF EXISTS "client_category_select_active" ON public.client_category;
CREATE POLICY "client_category_select_active" ON public.client_category
  FOR SELECT USING (
    (SELECT public.is_active_collaborator())
    AND (
      (SELECT public.is_manager_or_direction())
      OR NOT public.has_private_business_category('client', client_id)
    )
  );

DROP POLICY IF EXISTS "client_document_select_active" ON public.client_document;
CREATE POLICY "client_document_select_active" ON public.client_document
  FOR SELECT USING (
    (SELECT public.is_active_collaborator())
    AND (
      (SELECT public.is_manager_or_direction())
      OR NOT public.has_private_business_category('client', client_id)
    )
  );

DROP POLICY IF EXISTS "client_tool_select_active" ON public.client_tool;
CREATE POLICY "client_tool_select_active" ON public.client_tool
  FOR SELECT USING (
    (SELECT public.is_active_collaborator())
    AND (
      (SELECT public.is_manager_or_direction())
      OR NOT public.has_private_business_category('client', client_id)
    )
  );

DROP POLICY IF EXISTS "client_wiki_select_active" ON public.client_wiki;
CREATE POLICY "client_wiki_select_active" ON public.client_wiki
  FOR SELECT USING (
    (SELECT public.is_active_collaborator())
    AND (
      (SELECT public.is_manager_or_direction())
      OR NOT public.has_private_business_category('client', client_id)
    )
  );

DROP POLICY IF EXISTS "team_category_select_active" ON public.team_category;
CREATE POLICY "team_category_select_active" ON public.team_category
  FOR SELECT USING (
    (SELECT public.is_active_collaborator())
    AND (
      (SELECT public.is_manager_or_direction())
      OR NOT public.has_private_business_category('team', team_id)
    )
  );

DROP POLICY IF EXISTS "opportunity_category_select_active" ON public.opportunity_category;
CREATE POLICY "opportunity_category_select_active" ON public.opportunity_category
  FOR SELECT USING (
    (SELECT public.is_active_collaborator())
    AND (
      (SELECT public.is_manager_or_direction())
      OR EXISTS (
        SELECT 1
        FROM public.opportunity o
        WHERE o.id = opportunity_id
          AND NOT public.has_private_business_category('opportunity', o.id)
          AND NOT public.has_private_business_category('client', o.client_id)
      )
    )
  );

DROP POLICY IF EXISTS "opportunity_document_select_active" ON public.opportunity_document;
CREATE POLICY "opportunity_document_select_active" ON public.opportunity_document
  FOR SELECT USING (
    (SELECT public.is_active_collaborator())
    AND (
      (SELECT public.is_manager_or_direction())
      OR EXISTS (
        SELECT 1
        FROM public.opportunity o
        WHERE o.id = opportunity_id
          AND NOT public.has_private_business_category('opportunity', o.id)
          AND NOT public.has_private_business_category('client', o.client_id)
      )
    )
  );

DROP POLICY IF EXISTS "opportunity_tool_select_active" ON public.opportunity_tool;
CREATE POLICY "opportunity_tool_select_active" ON public.opportunity_tool
  FOR SELECT USING (
    (SELECT public.is_active_collaborator())
    AND (
      (SELECT public.is_manager_or_direction())
      OR EXISTS (
        SELECT 1
        FROM public.opportunity o
        WHERE o.id = opportunity_id
          AND NOT public.has_private_business_category('opportunity', o.id)
          AND NOT public.has_private_business_category('client', o.client_id)
      )
    )
  );

DROP POLICY IF EXISTS "mission_category_select_active" ON public.mission_category;
CREATE POLICY "mission_category_select_active" ON public.mission_category
  FOR SELECT USING (
    (SELECT public.is_active_collaborator())
    AND (
      (SELECT public.is_manager_or_direction())
      OR EXISTS (
        SELECT 1
        FROM public.mission m
        WHERE m.id = mission_id
          AND NOT public.has_private_business_category('mission', m.id)
          AND (
            m.client_id IS NULL
            OR NOT public.has_private_business_category('client', m.client_id)
          )
          AND (
            m.opportunity_id IS NULL
            OR EXISTS (
              SELECT 1
              FROM public.opportunity o
              WHERE o.id = m.opportunity_id
                AND NOT public.has_private_business_category('opportunity', o.id)
                AND NOT public.has_private_business_category('client', o.client_id)
            )
          )
      )
    )
  );

DROP POLICY IF EXISTS "mission_document_select_active" ON public.mission_document;
CREATE POLICY "mission_document_select_active" ON public.mission_document
  FOR SELECT USING (
    (SELECT public.is_active_collaborator())
    AND (
      (SELECT public.is_manager_or_direction())
      OR EXISTS (
        SELECT 1
        FROM public.mission m
        WHERE m.id = mission_id
          AND NOT public.has_private_business_category('mission', m.id)
          AND (
            m.client_id IS NULL
            OR NOT public.has_private_business_category('client', m.client_id)
          )
          AND (
            m.opportunity_id IS NULL
            OR EXISTS (
              SELECT 1
              FROM public.opportunity o
              WHERE o.id = m.opportunity_id
                AND NOT public.has_private_business_category('opportunity', o.id)
                AND NOT public.has_private_business_category('client', o.client_id)
            )
          )
      )
    )
  );

DROP POLICY IF EXISTS "mission_tool_select_active" ON public.mission_tool;
CREATE POLICY "mission_tool_select_active" ON public.mission_tool
  FOR SELECT USING (
    (SELECT public.is_active_collaborator())
    AND (
      (SELECT public.is_manager_or_direction())
      OR EXISTS (
        SELECT 1
        FROM public.mission m
        WHERE m.id = mission_id
          AND NOT public.has_private_business_category('mission', m.id)
          AND (
            m.client_id IS NULL
            OR NOT public.has_private_business_category('client', m.client_id)
          )
          AND (
            m.opportunity_id IS NULL
            OR EXISTS (
              SELECT 1
              FROM public.opportunity o
              WHERE o.id = m.opportunity_id
                AND NOT public.has_private_business_category('opportunity', o.id)
                AND NOT public.has_private_business_category('client', o.client_id)
            )
          )
      )
    )
  );

DROP POLICY IF EXISTS "mission_wiki_select_active" ON public.mission_wiki;
CREATE POLICY "mission_wiki_select_active" ON public.mission_wiki
  FOR SELECT USING (
    (SELECT public.is_active_collaborator())
    AND (
      (SELECT public.is_manager_or_direction())
      OR EXISTS (
        SELECT 1
        FROM public.mission m
        WHERE m.id = mission_id
          AND NOT public.has_private_business_category('mission', m.id)
          AND (
            m.client_id IS NULL
            OR NOT public.has_private_business_category('client', m.client_id)
          )
          AND (
            m.opportunity_id IS NULL
            OR EXISTS (
              SELECT 1
              FROM public.opportunity o
              WHERE o.id = m.opportunity_id
                AND NOT public.has_private_business_category('opportunity', o.id)
                AND NOT public.has_private_business_category('client', o.client_id)
            )
          )
      )
    )
  );


-- ============================================================================
-- B. Liste opportunités : catégories après LIMIT (plafond kanban 200 inclus)
-- ============================================================================

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
    SELECT *
    FROM counted
    ORDER BY created_at DESC
    LIMIT CASE WHEN v_board THEN 200 ELSE v_page_size END
    OFFSET CASE WHEN v_board THEN 0 ELSE v_offset END
  )
  SELECT
    c.id,
    c.opportunity_name,
    c.client_id,
    c.contact_client_id,
    c.collaborator_id,
    c.price,
    c.probability_confirmation,
    c.average_price,
    c.entry_average_price,
    c.kanban_status,
    c.kanban_order,
    c.is_active,
    c.priority,
    c.due_date_at,
    c.end_at,
    c.closed_at,
    c.invoice_frequency,
    c.client_name,
    c.contact_first_name,
    c.contact_last_name,
    c.responsible_first_name,
    c.responsible_last_name,
    c.profile_picture_file_path,
    coalesce(c.profile_picture_is_visual, false),
    coalesce(
      (
        SELECT jsonb_agg(
          jsonb_build_object('id', cb.id, 'label', cb.label)
          ORDER BY cb.label
        )
        FROM public.opportunity_category link
        JOIN public.category_business cb ON cb.id = link.category_id
        WHERE link.opportunity_id = c.id
      ),
      '[]'::jsonb
    ),
    c.created_at,
    c.total_count
  FROM page c
  ORDER BY c.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.list_opportunities_page(
  integer, integer, boolean, uuid, uuid, uuid, uuid[], text[], text, text, text, boolean, text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.list_opportunities_page(
  integer, integer, boolean, uuid, uuid, uuid, uuid[], text[], text, text, text, boolean, text
) TO authenticated;
-- ============================================================================
-- C. Liste clients : comptes et catégories après LIMIT
--    (le filtre nombre de missions calcule les comptes avant la pagination)
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
  WITH matched AS (
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
      mc.email_address AS main_contact_email
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
  prepared AS (
    SELECT
      m.*,
      CASE
        WHEN v_bucket = 'all' THEN NULL
        ELSE (
          SELECT count(*)::bigint
          FROM public.mission mi
          WHERE mi.client_id = m.id
        )
      END AS mission_count_filter
    FROM matched m
  ),
  filtered AS (
    SELECT p.*
    FROM prepared p
    WHERE
      v_bucket = 'all'
      OR (v_bucket = 'lt5' AND p.mission_count_filter < 5)
      OR (v_bucket = '5to20' AND p.mission_count_filter BETWEEN 5 AND 20)
      OR (v_bucket = 'gt20' AND p.mission_count_filter > 20)
  ),
  counted AS (
    SELECT f.*, count(*) OVER () AS total_count
    FROM filtered f
  ),
  page AS (
    SELECT *
    FROM counted
    ORDER BY client_name ASC
    LIMIT v_page_size
    OFFSET v_offset
  )
  SELECT
    page.id,
    page.client_name,
    page.website,
    page.address_city,
    page.is_active,
    page.facilitator,
    page.logo_file_path,
    coalesce(page.logo_is_visual, false),
    page.responsible_id,
    page.responsible_first_name,
    page.responsible_last_name,
    page.main_contact_id,
    page.main_contact_first_name,
    page.main_contact_last_name,
    page.main_contact_phone,
    page.main_contact_email,
    coalesce(
      (
        SELECT jsonb_agg(
          jsonb_build_object('id', cb.id, 'label', cb.label)
          ORDER BY cb.label
        )
        FROM public.client_category link
        JOIN public.category_business cb ON cb.id = link.category_id
        WHERE link.client_id = page.id
      ),
      '[]'::jsonb
    ),
    coalesce(
      page.mission_count_filter,
      (
        SELECT count(*)::bigint
        FROM public.mission mi
        WHERE mi.client_id = page.id
      )
    ),
    (
      SELECT count(*)::bigint
      FROM public.opportunity o
      WHERE o.client_id = page.id
    ),
    page.total_count
  FROM page
  ORDER BY page.client_name ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.list_clients_page(
  integer, integer, text, uuid, uuid, text, uuid[], text, text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.list_clients_page(
  integer, integer, text, uuid, uuid, text, uuid[], text, text
) TO authenticated;
-- ============================================================================
-- D. Agrégats analyses (accueil + /analyses)
-- Échéances CA : même règles que l'ancien calcul applicatif
-- (perdue exclue, unique / mensuel / trimestriel / annuel).
-- Pas de table temporaire : le pool de connexions réutiliserait un plan SPI périmé.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.load_analyses_payload(
  p_opportunities boolean DEFAULT true,
  p_missions boolean DEFAULT true,
  p_subscriptions boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_paris date := (timezone('Europe/Paris', now()))::date;
  v_paris_year integer := extract(year FROM v_paris)::integer;
  v_paris_month integer := extract(month FROM v_paris)::integer;
  v_labels text[] := ARRAY[
    'Janv.','Févr.','Mars','Avr.','Mai','Juin',
    'Juil.','Août','Sept.','Oct.','Nov.','Déc.'
  ];
  v_opp jsonb := NULL;
  v_mis jsonb := NULL;
  v_sub jsonb := NULL;
  v_inst jsonb := '[]'::jsonb;
  v_cur_rows jsonb := '[]'::jsonb;
  v_tool_rows jsonb := '[]'::jsonb;
  v_cat_rows jsonb := '[]'::jsonb;
  v_years integer[];
  v_mission_years integer[];
  v_sub_years integer[];
  v_y integer;
  v_m integer;
  v_points jsonb;
  v_pipeline jsonb := '{}'::jsonb;
  v_teams jsonb := '{}'::jsonb;
  v_by_client jsonb := '{}'::jsonb;
  v_client_year jsonb;
  v_options jsonb;
  v_kpis jsonb;
  v_by_status jsonb;
  v_missing bigint;
  v_aims jsonb;
  v_aims_by_year jsonb;
  v_count bigint;
  v_sum_price numeric;
  v_sum_avg numeric;
  v_won bigint;
  v_mission_kpis jsonb;
  v_mission_status jsonb;
  v_mission_team jsonb;
  v_mission_pipeline jsonb;
  rec record;
  v_start date;
  v_bucket text;
  v_months integer[];
  v_idx integer;
  v_end_idx integer;
  v_step integer;
  v_cy integer;
  v_cm integer;
  v_last date;
  v_amount numeric;
  v_encoded integer;
  v_monthly numeric;
  v_n integer;
  v_share numeric;
  v_ym text;
  v_month_start date;
  v_month_end date;
  v_max_month integer;
  v_cat jsonb;
  v_currency jsonb := '{}'::jsonb;
  v_by_tool jsonb := '{}'::jsonb;
  v_by_cat jsonb := '{}'::jsonb;
  v_tmp jsonb;
  v_evo jsonb;
BEGIN
  IF coalesce(p_opportunities, true) THEN
    v_inst := '[]'::jsonb;

    SELECT
      count(*)::bigint,
      coalesce(sum(coalesce(o.price, 0)), 0),
      coalesce(sum(coalesce(o.average_price, 0)), 0),
      count(*) FILTER (WHERE o.kanban_status = 'gagne')
    INTO v_count, v_sum_price, v_sum_avg, v_won
    FROM public.opportunity o
    WHERE (
      CASE
        WHEN o.kanban_status IN ('gagne', 'perdue')
          THEN extract(year FROM o.closed_at)::integer
        ELSE extract(year FROM o.due_date_at)::integer
      END
    ) = v_paris_year;

    v_kpis := jsonb_build_object(
      'count', coalesce(v_count, 0),
      'sumPrice', coalesce(v_sum_price, 0),
      'sumAveragePrice', coalesce(v_sum_avg, 0),
      'conversionRate', CASE
        WHEN coalesce(v_count, 0) = 0 THEN 0
        ELSE v_won::numeric / v_count
      END
    );

    SELECT coalesce(jsonb_agg(
      jsonb_build_object(
        'key', s.status,
        'label', s.label,
        'value', coalesce(c.cnt, 0)
      ) ORDER BY s.ord
    ), '[]'::jsonb)
    INTO v_by_status
    FROM (
      VALUES
        (1, 'suspect', 'Suspect'),
        (2, 'prospect', 'Prospect'),
        (3, 'besoin_specifie', 'Besoin spécifié'),
        (4, 'proposition_envoyee', 'Proposition envoyée'),
        (5, 'gagne', 'Gagné'),
        (6, 'perdue', 'Perdu')
    ) AS s(ord, status, label)
    LEFT JOIN (
      SELECT o.kanban_status::text AS status, count(*)::bigint AS cnt
      FROM public.opportunity o
      WHERE (
        CASE
          WHEN o.kanban_status IN ('gagne', 'perdue')
            THEN extract(year FROM o.closed_at)::integer
          ELSE extract(year FROM o.due_date_at)::integer
        END
      ) = v_paris_year
      GROUP BY o.kanban_status
    ) c ON c.status = s.status;

    SELECT count(*)::bigint
    INTO v_missing
    FROM public.opportunity o
    WHERE o.kanban_status <> 'perdue'
      AND (o.end_at IS NULL OR o.invoice_frequency IS NULL);

    FOR rec IN
      SELECT
        o.price,
        o.kanban_status,
        o.due_date_at,
        o.closed_at,
        o.end_at,
        o.invoice_frequency,
        o.client_id,
        c.client_name,
        coalesce(t.team_name, 'Sans pôle') AS team_label,
        EXISTS (
          SELECT 1
          FROM public.client_category cc
          JOIN public.category_business cb ON cb.id = cc.category_id
          WHERE cc.client_id = o.client_id
            AND cb.label = 'ESF'
        ) AS is_esf
      FROM public.opportunity o
      LEFT JOIN public.client c ON c.id = o.client_id
      LEFT JOIN public.collaborator col ON col.id = o.collaborator_id
      LEFT JOIN public.team t ON t.id = col.team_id
      WHERE o.kanban_status <> 'perdue'
        AND o.end_at IS NOT NULL
        AND o.invoice_frequency IS NOT NULL
        AND coalesce(o.price, 0) <> 0
        AND (
          (o.kanban_status = 'gagne' AND o.closed_at IS NOT NULL)
          OR (o.kanban_status <> 'gagne' AND o.due_date_at IS NOT NULL)
        )
    LOOP
      IF rec.kanban_status = 'gagne' THEN
        v_bucket := 'engage';
        v_start := rec.closed_at;
      ELSE
        v_bucket := 'previsionnel';
        v_start := rec.due_date_at;
      END IF;

      v_months := ARRAY[]::integer[];
      IF rec.invoice_frequency = 'unique' THEN
        v_months := ARRAY[
          extract(year FROM rec.end_at)::integer * 100
          + extract(month FROM rec.end_at)::integer
        ];
      ELSIF rec.invoice_frequency = 'mensuel' THEN
        v_idx := extract(year FROM v_start)::integer * 12
          + (extract(month FROM v_start)::integer - 1);
        v_end_idx := extract(year FROM rec.end_at)::integer * 12
          + (extract(month FROM rec.end_at)::integer - 1);
        WHILE v_idx <= v_end_idx LOOP
          v_cy := v_idx / 12;
          v_cm := (v_idx % 12) + 1;
          v_months := array_append(v_months, v_cy * 100 + v_cm);
          v_idx := v_idx + 1;
        END LOOP;
      ELSE
        v_step := CASE
          WHEN rec.invoice_frequency = 'trimestriel' THEN 3
          ELSE 12
        END;
        v_idx := extract(year FROM v_start)::integer * 12
          + (extract(month FROM v_start)::integer - 1)
          + 1;
        LOOP
          v_cy := v_idx / 12;
          v_cm := (v_idx % 12) + 1;
          v_last := (make_date(v_cy, v_cm, 1) + interval '1 month' - interval '1 day')::date;
          EXIT WHEN v_last > rec.end_at;
          v_months := array_append(v_months, v_cy * 100 + v_cm);
          v_idx := v_idx + v_step;
        END LOOP;
      END IF;

      IF coalesce(cardinality(v_months), 0) = 0 THEN
        CONTINUE;
      END IF;

      v_amount := round(rec.price / cardinality(v_months), 2);
      FOREACH v_encoded IN ARRAY v_months LOOP
        v_inst := v_inst || jsonb_build_array(jsonb_build_object(
          'year', v_encoded / 100,
          'month', v_encoded % 100,
          'amount', v_amount,
          'bucket', v_bucket,
          'client_id', rec.client_id::text,
          'client_label', coalesce(rec.client_name, 'Sans client'),
          'team_label', rec.team_label,
          'is_esf', rec.is_esf
        ));
      END LOOP;
    END LOOP;

    SELECT coalesce(jsonb_agg(
      jsonb_build_object('id', id, 'year', year, 'amount', amount)
      ORDER BY year DESC
    ), '[]'::jsonb)
    INTO v_aims
    FROM public.revenue_aim;

    SELECT coalesce(jsonb_object_agg(year::text, amount), '{}'::jsonb)
    INTO v_aims_by_year
    FROM public.revenue_aim;

    SELECT coalesce(array_agg(DISTINCT y ORDER BY y DESC), ARRAY[v_paris_year])
    INTO v_years
    FROM (
      SELECT v_paris_year AS y
      UNION
      SELECT year FROM public.revenue_aim
      UNION
      SELECT year FROM jsonb_to_recordset(v_inst) AS analyses_inst(
      year integer,
      month integer,
      amount numeric,
      bucket text,
      client_id text,
      client_label text,
      team_label text,
      is_esf boolean
    )
    ) s;

    FOREACH v_y IN ARRAY v_years LOOP
      SELECT coalesce(jsonb_agg(x.obj ORDER BY x.month), '[]'::jsonb)
      INTO v_points
      FROM (
        SELECT
          gs.m AS month,
          jsonb_build_object(
            'month', gs.m,
            'label', v_labels[gs.m],
            'engage', coalesce((
              SELECT round(sum(i.amount), 2)
              FROM jsonb_to_recordset(v_inst) AS i(
              year integer,
              month integer,
              amount numeric,
              bucket text,
              client_id text,
              client_label text,
              team_label text,
              is_esf boolean
            )
              WHERE i.year = v_y AND i.month = gs.m AND i.bucket = 'engage'
            ), 0),
            'previsionnel', coalesce((
              SELECT round(sum(i.amount), 2)
              FROM jsonb_to_recordset(v_inst) AS i(
              year integer,
              month integer,
              amount numeric,
              bucket text,
              client_id text,
              client_label text,
              team_label text,
              is_esf boolean
            )
              WHERE i.year = v_y AND i.month = gs.m AND i.bucket = 'previsionnel'
            ), 0)
          ) AS obj
        FROM generate_series(1, 12) AS gs(m)
      ) x;
      v_pipeline := v_pipeline || jsonb_build_object(v_y::text, v_points);

      SELECT coalesce(jsonb_agg(
        jsonb_build_object(
          'key', label,
          'label', label,
          'engage', engage,
          'previsionnel', previsionnel
        ) ORDER BY (engage + previsionnel) DESC, label
      ), '[]'::jsonb)
      INTO v_tmp
      FROM (
        SELECT
          team_label AS label,
          coalesce(round(sum(amount) FILTER (WHERE bucket = 'engage'), 2), 0) AS engage,
          coalesce(round(sum(amount) FILTER (WHERE bucket = 'previsionnel'), 2), 0) AS previsionnel
        FROM jsonb_to_recordset(v_inst) AS analyses_inst(
      year integer,
      month integer,
      amount numeric,
      bucket text,
      client_id text,
      client_label text,
      team_label text,
      is_esf boolean
    )
        WHERE year = v_y
        GROUP BY team_label
      ) teams;
      v_teams := v_teams || jsonb_build_object(v_y::text, v_tmp);

      SELECT coalesce(jsonb_object_agg(
        ids.client_id,
        jsonb_build_object(
          'clientId', ids.client_id,
          'total', (
            SELECT coalesce(round(sum(i.amount), 2), 0)
            FROM jsonb_to_recordset(v_inst) AS i(
              year integer,
              month integer,
              amount numeric,
              bucket text,
              client_id text,
              client_label text,
              team_label text,
              is_esf boolean
            )
            WHERE i.year = v_y
              AND (
                (ids.is_esf_entity AND i.is_esf)
                OR (NOT ids.is_esf_entity AND i.client_id = ids.client_id)
              )
          ),
          'months', (
            SELECT coalesce(jsonb_agg(
              jsonb_build_object(
                'month', gs.m,
                'label', v_labels[gs.m],
                'engage', coalesce((
                  SELECT round(sum(i.amount), 2)
                  FROM jsonb_to_recordset(v_inst) AS i(
              year integer,
              month integer,
              amount numeric,
              bucket text,
              client_id text,
              client_label text,
              team_label text,
              is_esf boolean
            )
                  WHERE i.year = v_y
                    AND i.month = gs.m
                    AND i.bucket = 'engage'
                    AND (
                      (ids.is_esf_entity AND i.is_esf)
                      OR (NOT ids.is_esf_entity AND i.client_id = ids.client_id)
                    )
                ), 0),
                'previsionnel', coalesce((
                  SELECT round(sum(i.amount), 2)
                  FROM jsonb_to_recordset(v_inst) AS i(
              year integer,
              month integer,
              amount numeric,
              bucket text,
              client_id text,
              client_label text,
              team_label text,
              is_esf boolean
            )
                  WHERE i.year = v_y
                    AND i.month = gs.m
                    AND i.bucket = 'previsionnel'
                    AND (
                      (ids.is_esf_entity AND i.is_esf)
                      OR (NOT ids.is_esf_entity AND i.client_id = ids.client_id)
                    )
                ), 0)
              ) ORDER BY gs.m
            ), '[]'::jsonb)
            FROM generate_series(1, 12) AS gs(m)
          )
        )
      ), '{}'::jsonb)
      INTO v_client_year
      FROM (
        SELECT DISTINCT client_id, false AS is_esf_entity
        FROM jsonb_to_recordset(v_inst) AS analyses_inst(
      year integer,
      month integer,
      amount numeric,
      bucket text,
      client_id text,
      client_label text,
      team_label text,
      is_esf boolean
    )
        WHERE year = v_y
        UNION ALL
        SELECT 'entity:ESF', true
        WHERE EXISTS (
          SELECT 1 FROM jsonb_to_recordset(v_inst) AS analyses_inst(
      year integer,
      month integer,
      amount numeric,
      bucket text,
      client_id text,
      client_label text,
      team_label text,
      is_esf boolean
    ) WHERE year = v_y AND is_esf
        )
      ) ids;
      v_by_client := v_by_client || jsonb_build_object(v_y::text, v_client_year);
    END LOOP;

    SELECT coalesce(jsonb_agg(
      jsonb_build_object('id', client_id, 'label', client_label)
      ORDER BY (client_id = 'entity:ESF') DESC, client_label
    ), '[]'::jsonb)
    INTO v_options
    FROM (
      SELECT DISTINCT client_id, client_label
      FROM jsonb_to_recordset(v_inst) AS analyses_inst(
      year integer,
      month integer,
      amount numeric,
      bucket text,
      client_id text,
      client_label text,
      team_label text,
      is_esf boolean
    )
      UNION
      SELECT 'entity:ESF', 'ESF'
      WHERE EXISTS (SELECT 1 FROM jsonb_to_recordset(v_inst) AS analyses_inst(
      year integer,
      month integer,
      amount numeric,
      bucket text,
      client_id text,
      client_label text,
      team_label text,
      is_esf boolean
    ) WHERE is_esf)
    ) opts;

    v_opp := jsonb_build_object(
      'kpis', v_kpis,
      'byStatus', v_by_status,
      'availableYears', to_jsonb(v_years),
      'defaultYear', v_paris_year,
      'pipelineByYear', v_pipeline,
      'caClientOptions', v_options,
      'caByClientByYear', v_by_client,
      'caByTeamByYear', v_teams,
      'missingBillingCount', coalesce(v_missing, 0),
      'revenueAims', v_aims,
      'revenueAimsByYear', v_aims_by_year
    );
  END IF;

  IF coalesce(p_missions, true) THEN
    SELECT jsonb_build_object(
      'count', count(*),
      'inProduction', count(*) FILTER (WHERE kanban_status = 'en_cours'),
      'abandoned', count(*) FILTER (
        WHERE kanban_status = 'archivee' AND completed_at IS NULL
      ),
      'completed', count(*) FILTER (WHERE completed_at IS NOT NULL)
    )
    INTO v_mission_kpis
    FROM public.mission;

    SELECT coalesce(jsonb_agg(
      jsonb_build_object(
        'key', s.status,
        'label', s.label,
        'value', coalesce(c.cnt, 0)
      ) ORDER BY s.ord
    ), '[]'::jsonb)
    INTO v_mission_status
    FROM (
      VALUES
        (1, 'a_faire', 'À faire'),
        (2, 'en_cours', 'En cours'),
        (3, 'terminee', 'Terminé')
    ) AS s(ord, status, label)
    LEFT JOIN (
      SELECT m.kanban_status::text AS status, count(*)::bigint AS cnt
      FROM public.mission m
      WHERE m.kanban_status IN ('a_faire', 'en_cours', 'terminee')
        AND m.end_at IS NOT NULL
        AND extract(year FROM m.end_at)::integer = v_paris_year
        AND extract(month FROM m.end_at)::integer = v_paris_month
      GROUP BY m.kanban_status
    ) c ON c.status = s.status;

    SELECT coalesce(jsonb_agg(
      jsonb_build_object('key', label, 'label', label, 'value', cnt)
      ORDER BY cnt DESC, label
    ), '[]'::jsonb)
    INTO v_mission_team
    FROM (
      SELECT coalesce(t.team_name, 'Sans pôle') AS label, count(*)::bigint AS cnt
      FROM public.mission m
      LEFT JOIN public.collaborator col ON col.id = m.collaborator_id
      LEFT JOIN public.team t ON t.id = col.team_id
      GROUP BY 1
    ) teams;

    SELECT coalesce(array_agg(DISTINCT yr ORDER BY yr DESC), ARRAY[v_paris_year])
    INTO v_mission_years
    FROM (
      SELECT v_paris_year AS yr
      UNION
      SELECT extract(year FROM start_at)::integer
      FROM public.mission
      WHERE start_at IS NOT NULL
    ) years;

    SELECT coalesce(jsonb_object_agg(y.yr::text, y.points), '{}'::jsonb)
    INTO v_mission_pipeline
    FROM (
      SELECT
        yr,
        (
          SELECT coalesce(jsonb_agg(
            jsonb_build_object(
              'key', gs.m::text,
              'label', v_labels[gs.m],
              'value', (
                SELECT count(*)::bigint
                FROM public.mission mi
                WHERE mi.start_at IS NOT NULL
                  AND extract(year FROM mi.start_at)::integer = yr
                  AND extract(month FROM mi.start_at)::integer = gs.m
              )
            ) ORDER BY gs.m
          ), '[]'::jsonb)
          FROM generate_series(1, 12) AS gs(m)
        ) AS points
      FROM unnest(v_mission_years) AS yr
    ) y;

    v_mis := jsonb_build_object(
      'kpis', v_mission_kpis,
      'byStatus', v_mission_status,
      'byTeam', v_mission_team,
      'availableYears', to_jsonb(v_mission_years),
      'defaultYear', CASE
        WHEN v_paris_year = ANY (v_mission_years) THEN v_paris_year
        ELSE v_mission_years[1]
      END,
      'pipelineByYear', v_mission_pipeline
    );
  END IF;

  IF coalesce(p_subscriptions, true) THEN
    v_cur_rows := '[]'::jsonb;
    v_tool_rows := '[]'::jsonb;
    v_cat_rows := '[]'::jsonb;

    FOR rec IN
      SELECT
        t.id AS tool_id,
        t.tool_name,
        s.subscription_plan::text AS plan,
        p.currency,
        p.amount,
        p.valid_from,
        p.valid_to,
        coalesce(
          (
            SELECT jsonb_agg(jsonb_build_object('id', c.id, 'label', c.label))
            FROM public.tool_category tc
            JOIN public.category c ON c.id = tc.category_id
            WHERE tc.tool_id = t.id
          ),
          '[]'::jsonb
        ) AS categories
      FROM public.tool t
      JOIN public.tool_subscription s ON s.tool_id = t.id
      JOIN public.tool_subscription_price p ON p.tool_subscription_id = s.id
    LOOP
      v_monthly := CASE
        WHEN rec.plan = 'mensuel' THEN rec.amount
        ELSE round(rec.amount / 12.0)
      END;
      v_n := jsonb_array_length(rec.categories);
      FOR v_y IN 2025..v_paris_year LOOP
        v_max_month := CASE WHEN v_y = v_paris_year THEN v_paris_month ELSE 12 END;
        FOR v_m IN 1..v_max_month LOOP
          v_month_start := make_date(v_y, v_m, 1);
          v_month_end := (v_month_start + interval '1 month' - interval '1 day')::date;
          IF rec.valid_from > v_month_end THEN
            CONTINUE;
          END IF;
          IF rec.valid_to IS NOT NULL AND rec.valid_to < v_month_start THEN
            CONTINUE;
          END IF;
          v_ym := to_char(v_month_start, 'YYYY-MM');
          v_cur_rows := v_cur_rows || jsonb_build_array(jsonb_build_object(
            'ym', v_ym,
            'currency', upper(rec.currency),
            'cents', v_monthly
          ));
          v_tool_rows := v_tool_rows || jsonb_build_array(jsonb_build_object(
            'ym', v_ym,
            'item_id', rec.tool_id::text,
            'label', rec.tool_name,
            'cents', v_monthly
          ));
          IF v_n = 0 THEN
            v_cat_rows := v_cat_rows || jsonb_build_array(jsonb_build_object(
              'ym', v_ym,
              'item_id', '__none__',
              'label', 'Sans catégorie',
              'cents', v_monthly
            ));
          ELSE
            v_share := v_monthly / v_n;
            FOR v_cat IN
              SELECT jsonb_array_elements(rec.categories)
            LOOP
              v_cat_rows := v_cat_rows || jsonb_build_array(jsonb_build_object(
                'ym', v_ym,
                'item_id', v_cat ->> 'id',
                'label', v_cat ->> 'label',
                'cents', v_share
              ));
            END LOOP;
          END IF;
        END LOOP;
      END LOOP;
    END LOOP;

    SELECT coalesce(array_agg(y ORDER BY y), ARRAY[]::integer[])
    INTO v_sub_years
    FROM generate_series(2025, v_paris_year) AS y;

    FOR v_y IN 2025..v_paris_year LOOP
      FOR v_m IN 1..12 LOOP
        v_ym := to_char(make_date(v_y, v_m, 1), 'YYYY-MM');

        SELECT coalesce(jsonb_agg(
          jsonb_build_object('currency', currency, 'amountCents', cents)
          ORDER BY currency
        ), '[]'::jsonb)
        INTO v_tmp
        FROM (
          SELECT currency, sum(cents) AS cents
          FROM jsonb_to_recordset(v_cur_rows) AS sub_currency(
            ym text,
            currency text,
            cents numeric
          )
          WHERE ym = v_ym
          GROUP BY currency
        ) cur;
        v_currency := v_currency || jsonb_build_object(v_ym, v_tmp);

        SELECT coalesce(jsonb_agg(
          jsonb_build_object(
            'key', item_id,
            'label', label,
            'value', round(cents)
          ) ORDER BY cents DESC, label
        ), '[]'::jsonb)
        INTO v_tmp
        FROM (
          SELECT item_id, max(label) AS label, sum(cents) AS cents
          FROM jsonb_to_recordset(v_tool_rows) AS sub_tool(
            ym text,
            item_id text,
            label text,
            cents numeric
          )
          WHERE ym = v_ym
          GROUP BY item_id
        ) tools;
        v_by_tool := v_by_tool || jsonb_build_object(v_ym, v_tmp);

        SELECT coalesce(jsonb_agg(
          jsonb_build_object(
            'key', item_id,
            'label', label,
            'value', round(cents)
          ) ORDER BY cents DESC, label
        ), '[]'::jsonb)
        INTO v_tmp
        FROM (
          SELECT item_id, max(label) AS label, sum(cents) AS cents
          FROM jsonb_to_recordset(v_cat_rows) AS sub_cat(
            ym text,
            item_id text,
            label text,
            cents numeric
          )
          WHERE ym = v_ym
          GROUP BY item_id
        ) cats;
        v_by_cat := v_by_cat || jsonb_build_object(v_ym, v_tmp);
      END LOOP;
    END LOOP;

    SELECT coalesce(jsonb_agg(
      jsonb_build_object(
        'month', gs.m,
        'label', v_labels[gs.m],
        'values', (
          SELECT coalesce(jsonb_object_agg(
            yr::text,
            CASE
              WHEN yr = v_paris_year AND gs.m > v_paris_month THEN 0
              ELSE coalesce((
                SELECT sum(cents)
                FROM jsonb_to_recordset(v_cur_rows) AS sub_currency(
            ym text,
            currency text,
            cents numeric
          )
                WHERE ym = to_char(make_date(yr, gs.m, 1), 'YYYY-MM')
              ), 0)
            END
          ), '{}'::jsonb)
          FROM generate_series(2025, v_paris_year) AS yr
        )
      ) ORDER BY gs.m
    ), '[]'::jsonb)
    INTO v_evo
    FROM generate_series(1, 12) AS gs(m);

    v_sub := jsonb_build_object(
      'currentYear', v_paris_year,
      'currentMonth', v_paris_month,
      'startYear', 2025,
      'years', to_jsonb(v_sub_years),
      'monthlyByCurrencyByMonth', v_currency,
      'costByToolByMonth', v_by_tool,
      'costByCategoryByMonth', v_by_cat,
      'costEvolution', jsonb_build_object(
        'years', to_jsonb(v_sub_years),
        'points', v_evo
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'opportunities', v_opp,
    'missions', v_mis,
    'subscriptions', v_sub
  );
END;
$$;

REVOKE ALL ON FUNCTION public.load_analyses_payload(boolean, boolean, boolean)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.load_analyses_payload(boolean, boolean, boolean)
  TO authenticated;
