-- Opportunity: invoice_frequency + due_date_at obligatoire ;
-- end_at = fin de facturation (manuel) ; closed_at seul à la clôture/réouverture.

CREATE TYPE public.opportunity_invoice_frequency_enum AS ENUM (
  'unique',
  'mensuel',
  'trimestriel',
  'annuel'
);

ALTER TABLE public.opportunity
  ADD COLUMN invoice_frequency public.opportunity_invoice_frequency_enum NULL;

-- Backfill before enforcing due_date_at NOT NULL via CHECK
UPDATE public.opportunity
SET due_date_at = COALESCE(
  due_date_at,
  end_at,
  closed_at,
  (now() AT TIME ZONE 'Europe/Paris')::date
)
WHERE due_date_at IS NULL;

ALTER TABLE public.opportunity
  DROP CONSTRAINT IF EXISTS opportunity_due_or_end_required;

ALTER TABLE public.opportunity
  DROP CONSTRAINT IF EXISTS opportunity_closed_requires_end_at;

ALTER TABLE public.opportunity
  ADD CONSTRAINT opportunity_due_date_required CHECK (due_date_at IS NOT NULL);

CREATE OR REPLACE FUNCTION public.set_opportunity_kanban_defaults()
RETURNS trigger AS $$
DECLARE
  v_mapped_probability numeric;
  v_today date := (now() AT TIME ZONE 'Europe/Paris')::date;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF EXISTS (
      SELECT 1 FROM public.mission WHERE client_id = NEW.client_id
      UNION ALL
      SELECT 1 FROM public.opportunity WHERE client_id = NEW.client_id
    ) THEN
      NEW.kanban_status := 'besoin_specifie';
    ELSE
      NEW.kanban_status := 'suspect';
    END IF;
  END IF;

  IF TG_OP = 'INSERT' OR NEW.kanban_status IS DISTINCT FROM OLD.kanban_status THEN
    v_mapped_probability := CASE NEW.kanban_status
      WHEN 'suspect' THEN 10
      WHEN 'prospect' THEN 30
      WHEN 'besoin_specifie' THEN 50
      WHEN 'proposition_envoyee' THEN 75
      WHEN 'gagne' THEN 100
      WHEN 'perdue' THEN 0
    END;

    IF TG_OP = 'INSERT' OR NEW.probability_confirmation < v_mapped_probability THEN
      NEW.probability_confirmation := v_mapped_probability;
    END IF;
  END IF;

  IF NEW.kanban_status IN ('gagne', 'perdue') THEN
    NEW.is_active := false;
  ELSIF TG_OP = 'UPDATE' AND OLD.kanban_status IN ('gagne', 'perdue') THEN
    NEW.is_active := true;
  END IF;

  -- Snapshot montant pondéré à la création uniquement
  IF TG_OP = 'INSERT' THEN
    NEW.entry_average_price :=
      COALESCE(NEW.price, 0) * NEW.probability_confirmation / 100;
  END IF;

  -- closed_at à la clôture / réouverture (end_at = fin de facturation, non géré ici)
  IF NEW.kanban_status IN ('gagne', 'perdue') THEN
    IF TG_OP = 'INSERT'
       OR OLD.kanban_status IS DISTINCT FROM NEW.kanban_status THEN
      NEW.closed_at := v_today;
    END IF;
  ELSIF TG_OP = 'UPDATE'
        AND OLD.kanban_status IN ('gagne', 'perdue')
        AND NEW.kanban_status NOT IN ('gagne', 'perdue') THEN
    NEW.closed_at := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

ALTER FUNCTION public.set_opportunity_kanban_defaults() SET search_path = public;

-- list_opportunities_page: add invoice_frequency (return type change → DROP + CREATE)
DROP FUNCTION IF EXISTS public.list_opportunities_page(
  integer, integer, boolean, uuid, uuid, uuid, uuid[], text[], text, text, text, boolean, text
);

CREATE FUNCTION public.list_opportunities_page(
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
      coalesce(
        (
          SELECT jsonb_agg(
            jsonb_build_object('id', cb.id, 'label', cb.label)
            ORDER BY cb.label
          )
          FROM public.opportunity_category link
          JOIN public.category_business cb ON cb.id = link.category_id
          WHERE link.opportunity_id = o.id
        ),
        '[]'::jsonb
      ) AS categories,
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
    c.categories,
    c.created_at,
    c.total_count
  FROM counted c
  ORDER BY c.created_at DESC
  LIMIT CASE WHEN v_board THEN 500 ELSE v_page_size END
  OFFSET CASE WHEN v_board THEN 0 ELSE v_offset END;
END;
$$;

REVOKE ALL ON FUNCTION public.list_opportunities_page(
  integer, integer, boolean, uuid, uuid, uuid, uuid[], text[], text, text, text, boolean, text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.list_opportunities_page(
  integer, integer, boolean, uuid, uuid, uuid, uuid[], text[], text, text, text, boolean, text
) TO authenticated;
