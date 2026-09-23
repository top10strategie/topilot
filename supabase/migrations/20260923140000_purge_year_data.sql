-- Purge annuelle (Manager/Direction) + entity_type data_purge
-- Hard-delete opportunités / missions / séries / audit_log d'une année éligible (≤ N-3).
-- Pas de policy DELETE générique : uniquement via cette RPC SECURITY DEFINER.

ALTER TABLE public.audit_log
  DROP CONSTRAINT IF EXISTS audit_log_entity_type_check;

ALTER TABLE public.audit_log
  ADD CONSTRAINT audit_log_entity_type_check CHECK (
    entity_type = ANY (ARRAY[
      'category', 'category_business', 'team', 'collaborator', 'client', 'contact_client',
      'opportunity', 'mission', 'mission_series', 'document_type', 'document',
      'tool', 'tool_access', 'tool_subscription', 'tool_subscription_price',
      'exchange_rate', 'wiki', 'setting', 'note', 'data_purge'
    ]::text[])
  );

CREATE OR REPLACE FUNCTION public.opportunity_purge_eligibility_year(p_opportunity_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT GREATEST(
    EXTRACT(YEAR FROM o.closed_at)::integer,
    COALESCE(EXTRACT(YEAR FROM o.end_at)::integer, 0),
    COALESCE(
      (
        SELECT MAX(EXTRACT(YEAR FROM s.invoice_at)::integer)
        FROM public.invoice_schedule s
        WHERE s.opportunity_id = o.id
      ),
      0
    )
  )
  FROM public.opportunity o
  WHERE o.id = p_opportunity_id
    AND o.closed_at IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.opportunity_purge_eligibility_year(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.opportunity_purge_eligibility_year(uuid) TO authenticated;

/**
 * Preview (p_dry_run = true) ou exécution de la purge annuelle.
 * Retourne jsonb : { year, dry_run, opportunities, missions, mission_series, audit_logs }
 */
CREATE OR REPLACE FUNCTION public.purge_year_data(
  p_year integer,
  p_dry_run boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_year integer;
  v_collab_id uuid;
  v_opp_ids uuid[];
  v_mission_ids uuid[];
  v_series_ids uuid[];
  v_opp_count integer;
  v_mission_count integer;
  v_series_count integer;
  v_audit_count integer;
  v_purge_entity_id uuid := gen_random_uuid();
BEGIN
  IF NOT public.is_active_collaborator() OR NOT public.is_manager_or_direction() THEN
    RAISE EXCEPTION 'forbidden'
      USING ERRCODE = '42501';
  END IF;

  IF p_year IS NULL OR p_year < 2000 OR p_year > 2100 THEN
    RAISE EXCEPTION 'invalid_year'
      USING ERRCODE = '22023';
  END IF;

  v_current_year := EXTRACT(YEAR FROM (timezone('Europe/Paris', now())))::integer;
  IF p_year > v_current_year - 3 THEN
    RAISE EXCEPTION 'year_not_eligible'
      USING ERRCODE = '22023',
            MESSAGE = format(
              'Année %s non éligible (max autorisée : %s).',
              p_year,
              v_current_year - 3
            );
  END IF;

  v_collab_id := public.current_collaborator_id();

  SELECT COALESCE(array_agg(o.id), ARRAY[]::uuid[])
  INTO v_opp_ids
  FROM public.opportunity o
  WHERE o.kanban_status IN ('gagne', 'perdue')
    AND o.closed_at IS NOT NULL
    AND public.opportunity_purge_eligibility_year(o.id) = p_year;

  SELECT COALESCE(array_agg(m.id), ARRAY[]::uuid[])
  INTO v_mission_ids
  FROM public.mission m
  WHERE m.kanban_status IN ('terminee', 'archivee')
    AND m.end_at IS NOT NULL
    AND EXTRACT(YEAR FROM m.end_at)::integer = p_year;

  SELECT COALESCE(array_agg(ms.id), ARRAY[]::uuid[])
  INTO v_series_ids
  FROM public.mission_series ms
  WHERE ms.ends_on IS NOT NULL
    AND EXTRACT(YEAR FROM ms.ends_on)::integer = p_year;

  SELECT COUNT(*)::integer
  INTO v_audit_count
  FROM public.audit_log a
  WHERE EXTRACT(YEAR FROM (a.created_at AT TIME ZONE 'Europe/Paris'))::integer = p_year;

  v_opp_count := COALESCE(cardinality(v_opp_ids), 0);
  v_mission_count := COALESCE(cardinality(v_mission_ids), 0);
  v_series_count := COALESCE(cardinality(v_series_ids), 0);

  IF p_dry_run THEN
    RETURN jsonb_build_object(
      'year', p_year,
      'dry_run', true,
      'opportunities', v_opp_count,
      'missions', v_mission_count,
      'mission_series', v_series_count,
      'audit_logs', v_audit_count
    );
  END IF;

  -- Transfert documents → client (avant CASCADE des jonctions)
  IF v_opp_count > 0 THEN
    INSERT INTO public.client_document (client_id, document_id)
    SELECT o.client_id, od.document_id
    FROM public.opportunity o
    JOIN public.opportunity_document od ON od.opportunity_id = o.id
    WHERE o.id = ANY (v_opp_ids)
      AND o.client_id IS NOT NULL
    ON CONFLICT (client_id, document_id) DO NOTHING;
  END IF;

  IF v_mission_count > 0 THEN
    INSERT INTO public.client_document (client_id, document_id)
    SELECT m.client_id, md.document_id
    FROM public.mission m
    JOIN public.mission_document md ON md.mission_id = m.id
    WHERE m.id = ANY (v_mission_ids)
      AND m.client_id IS NOT NULL
    ON CONFLICT (client_id, document_id) DO NOTHING;
  END IF;

  IF v_mission_count > 0 THEN
    DELETE FROM public.mission WHERE id = ANY (v_mission_ids);
  END IF;

  IF v_opp_count > 0 THEN
    DELETE FROM public.opportunity WHERE id = ANY (v_opp_ids);
  END IF;

  IF v_series_count > 0 THEN
    DELETE FROM public.mission_series WHERE id = ANY (v_series_ids);
  END IF;

  DELETE FROM public.audit_log a
  WHERE EXTRACT(YEAR FROM (a.created_at AT TIME ZONE 'Europe/Paris'))::integer = p_year;

  INSERT INTO public.audit_log (
    collaborator_id,
    entity_type,
    entity_id,
    action,
    label,
    old_value,
    new_value
  )
  VALUES (
    v_collab_id,
    'data_purge',
    v_purge_entity_id,
    'DELETE',
    format('Purge annuelle %s', p_year),
    NULL,
    jsonb_build_object(
      'year', p_year,
      'opportunities', v_opp_count,
      'missions', v_mission_count,
      'mission_series', v_series_count,
      'audit_logs', v_audit_count
    )
  );

  RETURN jsonb_build_object(
    'year', p_year,
    'dry_run', false,
    'opportunities', v_opp_count,
    'missions', v_mission_count,
    'mission_series', v_series_count,
    'audit_logs', v_audit_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.purge_year_data(integer, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_year_data(integer, boolean) TO authenticated;

COMMENT ON FUNCTION public.purge_year_data(integer, boolean) IS
  'Purge hard-delete opportunités/missions/séries/audit_log d''une année ≤ N-3. Manager/Direction uniquement.';
