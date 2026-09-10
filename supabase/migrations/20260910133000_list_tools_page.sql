-- ============================================================================
-- TOPilot — Pagination serveur /tools (filtres alignés UI)
-- SECURITY INVOKER : RLS tool / jointures appliquées.
-- Shape alignée TOOL_LIST_SELECT (categories, clients, subscriptions).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.list_tools_page(
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 24,
  p_category_ids uuid[] DEFAULT NULL,
  p_client_ids uuid[] DEFAULT NULL,
  p_include_interne boolean DEFAULT false,
  p_cost_bucket text DEFAULT 'all',
  p_with_subscription boolean DEFAULT false,
  p_without_subscription boolean DEFAULT false,
  p_query text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  tool_name text,
  url text,
  description text,
  categories jsonb,
  clients jsonb,
  subscriptions jsonb,
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
  v_query text := nullif(trim(p_query), '');
  v_query_pattern text;
  v_category_ids uuid[] := coalesce(p_category_ids, ARRAY[]::uuid[]);
  v_client_ids uuid[] := coalesce(p_client_ids, ARRAY[]::uuid[]);
  v_include_interne boolean := coalesce(p_include_interne, false);
  v_filter_clients boolean;
  v_bucket text := coalesce(nullif(trim(p_cost_bucket), ''), 'all');
  v_with_sub boolean := coalesce(p_with_subscription, false);
  v_without_sub boolean := coalesce(p_without_subscription, false);
BEGIN
  IF v_bucket NOT IN ('all', 'lt10', '10to20', 'gt20') THEN
    v_bucket := 'all';
  END IF;

  v_filter_clients := v_include_interne OR cardinality(v_client_ids) > 0;
  v_offset := (v_page - 1) * v_page_size;
  IF v_query IS NOT NULL THEN
    v_query_pattern := '%' || lower(v_query) || '%';
  END IF;

  RETURN QUERY
  WITH cost AS (
    SELECT
      s.tool_id,
      count(DISTINCT upper(p.currency))::integer AS currency_count,
      coalesce(
        sum(
          CASE
            WHEN s.subscription_plan = 'annuel'::public.tool_subscription_plan_enum
              THEN round(p.amount / 12.0)
            ELSE p.amount
          END
        ),
        0
      )::bigint AS monthly_cents
    FROM public.tool_subscription s
    JOIN public.tool_subscription_price p ON p.tool_subscription_id = s.id
    WHERE p.valid_to IS NULL
    GROUP BY s.tool_id
  ),
  base AS (
    SELECT
      t.id,
      t.tool_name,
      t.url,
      t.description,
      coalesce(
        (
          SELECT jsonb_agg(
            jsonb_build_object('id', cat.id, 'label', cat.label)
            ORDER BY cat.label
          )
          FROM public.tool_category tc
          JOIN public.category cat ON cat.id = tc.category_id
          WHERE tc.tool_id = t.id
        ),
        '[]'::jsonb
      ) AS categories,
      coalesce(
        (
          SELECT jsonb_agg(
            jsonb_build_object('id', c.id, 'client_name', c.client_name)
            ORDER BY c.client_name
          )
          FROM public.client_tool ct
          JOIN public.client c ON c.id = ct.client_id
          WHERE ct.tool_id = t.id
        ),
        '[]'::jsonb
      ) AS clients,
      coalesce(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', s.id,
              'title', s.title,
              'subscription_plan', s.subscription_plan,
              'prices', coalesce(
                (
                  SELECT jsonb_agg(
                    jsonb_build_object(
                      'id', p.id,
                      'currency', p.currency,
                      'amount_cents', p.amount,
                      'valid_from', p.valid_from,
                      'valid_to', p.valid_to
                    )
                    ORDER BY p.valid_from
                  )
                  FROM public.tool_subscription_price p
                  WHERE p.tool_subscription_id = s.id
                ),
                '[]'::jsonb
              )
            )
            ORDER BY s.title
          )
          FROM public.tool_subscription s
          WHERE s.tool_id = t.id
        ),
        '[]'::jsonb
      ) AS subscriptions,
      coalesce(cost.currency_count, 0) AS currency_count,
      coalesce(cost.monthly_cents, 0) AS monthly_cents
    FROM public.tool t
    LEFT JOIN cost ON cost.tool_id = t.id
    WHERE
      (
        cardinality(v_category_ids) = 0
        OR (
          SELECT count(DISTINCT tc.category_id)
          FROM public.tool_category tc
          WHERE tc.tool_id = t.id
            AND tc.category_id = ANY (v_category_ids)
        ) = cardinality(v_category_ids)
      )
      AND (
        NOT v_filter_clients
        OR (
          (
            v_include_interne
            AND NOT EXISTS (
              SELECT 1
              FROM public.client_tool ct0
              WHERE ct0.tool_id = t.id
            )
          )
          OR (
            cardinality(v_client_ids) > 0
            AND EXISTS (
              SELECT 1
              FROM public.client_tool ct1
              WHERE ct1.tool_id = t.id
                AND ct1.client_id = ANY (v_client_ids)
            )
          )
        )
      )
      AND (
        v_query_pattern IS NULL
        OR lower(t.tool_name) LIKE v_query_pattern
        OR lower(t.url) LIKE v_query_pattern
        OR lower(coalesce(t.description, '')) LIKE v_query_pattern
        OR EXISTS (
          SELECT 1
          FROM public.tool_category tcq
          JOIN public.category catq ON catq.id = tcq.category_id
          WHERE tcq.tool_id = t.id
            AND lower(catq.label) LIKE v_query_pattern
        )
        OR EXISTS (
          SELECT 1
          FROM public.client_tool ctq
          JOIN public.client cq ON cq.id = ctq.client_id
          WHERE ctq.tool_id = t.id
            AND lower(cq.client_name) LIKE v_query_pattern
        )
      )
  ),
  filtered AS (
    SELECT
      b.*,
      (
        b.currency_count > 1
        OR (b.currency_count = 1 AND b.monthly_cents > 0)
      ) AS has_active_cost,
      CASE
        WHEN b.currency_count = 1 AND b.monthly_cents > 0
          THEN (b.monthly_cents::numeric / 100.0)
        ELSE NULL
      END AS monthly_euros
    FROM base b
  ),
  gated AS (
    SELECT f.*
    FROM filtered f
    WHERE
      (
        (v_with_sub AND v_without_sub)
        OR (NOT v_with_sub AND NOT v_without_sub)
        OR (v_with_sub AND NOT v_without_sub AND f.has_active_cost)
        OR (v_without_sub AND NOT v_with_sub AND NOT f.has_active_cost)
      )
      AND (
        v_bucket = 'all'
        OR (
          f.monthly_euros IS NOT NULL
          AND (
            (v_bucket = 'lt10' AND f.monthly_euros < 10)
            OR (v_bucket = '10to20' AND f.monthly_euros >= 10 AND f.monthly_euros <= 20)
            OR (v_bucket = 'gt20' AND f.monthly_euros > 20)
          )
        )
      )
  ),
  counted AS (
    SELECT g.*, count(*) OVER () AS total_count
    FROM gated g
  )
  SELECT
    c.id,
    c.tool_name,
    c.url,
    c.description,
    c.categories,
    c.clients,
    c.subscriptions,
    c.total_count
  FROM counted c
  ORDER BY c.tool_name ASC
  LIMIT v_page_size
  OFFSET v_offset;
END;
$$;

REVOKE ALL ON FUNCTION public.list_tools_page(
  integer, integer, uuid[], uuid[], boolean, text, boolean, boolean, text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.list_tools_page(
  integer, integer, uuid[], uuid[], boolean, text, boolean, boolean, text
) TO authenticated;
