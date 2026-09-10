-- ============================================================================
-- TOPilot — Pagination serveur /documents (filtres alignés UI)
-- SECURITY INVOKER : RLS document / jointures appliquées.
-- is_latest / lineage calculés en SQL (parent_document_id + max version_number).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.list_documents_page(
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 25,
  p_type_ids uuid[] DEFAULT NULL,
  p_versions integer[] DEFAULT NULL,
  p_client_ids uuid[] DEFAULT NULL,
  p_include_interne boolean DEFAULT false,
  p_query text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  document_name text,
  document_type_id uuid,
  document_type_label text,
  storage_type public.document_storage_type_enum,
  file_path text,
  url text,
  is_visual boolean,
  version_number integer,
  parent_document_id uuid,
  lineage_root_id uuid,
  is_latest boolean,
  created_at timestamptz,
  updated_at timestamptz,
  linked jsonb,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_page integer := GREATEST(1, coalesce(p_page, 1));
  v_page_size integer := GREATEST(1, LEAST(coalesce(p_page_size, 25), 100));
  v_offset integer;
  v_query text := nullif(trim(p_query), '');
  v_query_pattern text;
  v_type_ids uuid[] := coalesce(p_type_ids, ARRAY[]::uuid[]);
  v_versions integer[] := coalesce(p_versions, ARRAY[]::integer[]);
  v_client_ids uuid[] := coalesce(p_client_ids, ARRAY[]::uuid[]);
  v_include_interne boolean := coalesce(p_include_interne, false);
  v_filter_clients boolean;
BEGIN
  v_filter_clients := v_include_interne OR cardinality(v_client_ids) > 0;
  v_offset := (v_page - 1) * v_page_size;
  IF v_query IS NOT NULL THEN
    v_query_pattern := '%' || lower(v_query) || '%';
  END IF;

  RETURN QUERY
  WITH lineage_max AS (
    SELECT
      coalesce(d.parent_document_id, d.id) AS root_id,
      max(d.version_number) AS max_version
    FROM public.document d
    GROUP BY coalesce(d.parent_document_id, d.id)
  ),
  base AS (
    SELECT
      d.id,
      d.document_name,
      d.document_type_id,
      coalesce(dt.label, '—') AS document_type_label,
      d.storage_type,
      d.file_path,
      d.url,
      d.is_visual,
      d.version_number,
      d.parent_document_id,
      coalesce(d.parent_document_id, d.id) AS lineage_root_id,
      (d.version_number = lm.max_version) AS is_latest,
      d.created_at,
      d.updated_at,
      coalesce(
        (
          SELECT jsonb_agg(entry ORDER BY entry->>'kind', entry->>'name')
          FROM (
            SELECT DISTINCT ON (u.kind, u.entity_id)
              jsonb_build_object(
                'kind', u.kind,
                'id', u.entity_id,
                'name', u.entity_name
              ) AS entry
            FROM (
              SELECT
                'client'::text AS kind,
                c.id AS entity_id,
                c.client_name AS entity_name
              FROM public.client_document cd
              JOIN public.client c ON c.id = cd.client_id
              WHERE cd.document_id = d.id

              UNION ALL

              SELECT
                'client'::text,
                c.id,
                c.client_name
              FROM public.client c
              WHERE c.logo_id = d.id

              UNION ALL

              SELECT
                'opportunity'::text,
                o.id,
                o.opportunity_name
              FROM public.opportunity_document od
              JOIN public.opportunity o ON o.id = od.opportunity_id
              WHERE od.document_id = d.id

              UNION ALL

              SELECT
                'mission'::text,
                m.id,
                m.mission_name
              FROM public.mission_document md
              JOIN public.mission m ON m.id = md.mission_id
              WHERE md.document_id = d.id

              UNION ALL

              SELECT
                'collaborator'::text,
                col.id,
                trim(both FROM coalesce(col.first_name, '') || ' ' || coalesce(col.last_name, ''))
              FROM public.collaborator col
              WHERE col.profile_picture_id = d.id

              UNION ALL

              SELECT
                'contact'::text,
                cc.id,
                CASE
                  WHEN cl.client_name IS NOT NULL THEN
                    trim(both FROM coalesce(cc.first_name, '') || ' ' || coalesce(cc.last_name, ''))
                    || ' (' || cl.client_name || ')'
                  ELSE
                    trim(both FROM coalesce(cc.first_name, '') || ' ' || coalesce(cc.last_name, ''))
                END
              FROM public.contact_client cc
              LEFT JOIN public.client cl ON cl.id = cc.client_id
              WHERE cc.profile_picture_id = d.id
            ) u
            ORDER BY u.kind, u.entity_id, u.entity_name
          ) dedup
        ),
        '[]'::jsonb
      ) AS linked
    FROM public.document d
    LEFT JOIN public.document_type dt ON dt.id = d.document_type_id
    JOIN lineage_max lm ON lm.root_id = coalesce(d.parent_document_id, d.id)
    WHERE
      (
        cardinality(v_versions) = 0
        OR d.version_number = ANY (v_versions)
      )
      AND (
        cardinality(v_versions) > 0
        OR d.version_number = lm.max_version
      )
      AND (
        cardinality(v_type_ids) = 0
        OR d.document_type_id = ANY (v_type_ids)
      )
      AND (
        NOT v_filter_clients
        OR (
          (
            v_include_interne
            AND NOT EXISTS (
              SELECT 1
              FROM public.client_document cd0
              WHERE cd0.document_id = d.id
            )
            AND NOT EXISTS (
              SELECT 1
              FROM public.client c0
              WHERE c0.logo_id = d.id
            )
          )
          OR (
            cardinality(v_client_ids) > 0
            AND (
              EXISTS (
                SELECT 1
                FROM public.client_document cd1
                WHERE cd1.document_id = d.id
                  AND cd1.client_id = ANY (v_client_ids)
              )
              OR EXISTS (
                SELECT 1
                FROM public.client c1
                WHERE c1.logo_id = d.id
                  AND c1.id = ANY (v_client_ids)
              )
            )
          )
        )
      )
      AND (
        v_query_pattern IS NULL
        OR lower(d.document_name) LIKE v_query_pattern
        OR lower(coalesce(dt.label, '')) LIKE v_query_pattern
        OR lower('v' || d.version_number::text) LIKE v_query_pattern
        OR EXISTS (
          SELECT 1
          FROM public.client_document cdq
          JOIN public.client cq ON cq.id = cdq.client_id
          WHERE cdq.document_id = d.id
            AND lower(cq.client_name) LIKE v_query_pattern
        )
        OR EXISTS (
          SELECT 1
          FROM public.client cq2
          WHERE cq2.logo_id = d.id
            AND lower(cq2.client_name) LIKE v_query_pattern
        )
        OR EXISTS (
          SELECT 1
          FROM public.opportunity_document odq
          JOIN public.opportunity oq ON oq.id = odq.opportunity_id
          WHERE odq.document_id = d.id
            AND lower(oq.opportunity_name) LIKE v_query_pattern
        )
        OR EXISTS (
          SELECT 1
          FROM public.mission_document mdq
          JOIN public.mission mq ON mq.id = mdq.mission_id
          WHERE mdq.document_id = d.id
            AND lower(mq.mission_name) LIKE v_query_pattern
        )
        OR EXISTS (
          SELECT 1
          FROM public.collaborator colq
          WHERE colq.profile_picture_id = d.id
            AND lower(
              coalesce(colq.first_name, '') || ' ' || coalesce(colq.last_name, '')
            ) LIKE v_query_pattern
        )
        OR EXISTS (
          SELECT 1
          FROM public.contact_client ccq
          LEFT JOIN public.client clq ON clq.id = ccq.client_id
          WHERE ccq.profile_picture_id = d.id
            AND (
              lower(
                coalesce(ccq.first_name, '') || ' ' || coalesce(ccq.last_name, '')
              ) LIKE v_query_pattern
              OR lower(coalesce(clq.client_name, '')) LIKE v_query_pattern
            )
        )
      )
  ),
  counted AS (
    SELECT b.*, count(*) OVER () AS total_count
    FROM base b
  )
  SELECT
    c.id,
    c.document_name,
    c.document_type_id,
    c.document_type_label,
    c.storage_type,
    c.file_path,
    c.url,
    c.is_visual,
    c.version_number,
    c.parent_document_id,
    c.lineage_root_id,
    c.is_latest,
    c.created_at,
    c.updated_at,
    c.linked,
    c.total_count
  FROM counted c
  ORDER BY c.created_at DESC
  LIMIT v_page_size
  OFFSET v_offset;
END;
$$;

REVOKE ALL ON FUNCTION public.list_documents_page(
  integer, integer, uuid[], integer[], uuid[], boolean, text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.list_documents_page(
  integer, integer, uuid[], integer[], uuid[], boolean, text
) TO authenticated;
