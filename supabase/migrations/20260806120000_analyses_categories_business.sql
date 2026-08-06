-- TOPilot — dates missions/opp, snapshots opportunités, category_business,
-- RLS privatisation + cascade, preferred_mission_category_ids

-- ============================================================================
-- A. Missions : start_at / end_at obligatoires
-- ============================================================================

UPDATE public.mission
SET start_at = (now() AT TIME ZONE 'Europe/Paris')::date
WHERE start_at IS NULL;

UPDATE public.mission
SET end_at = COALESCE(end_at, start_at, (now() AT TIME ZONE 'Europe/Paris')::date)
WHERE end_at IS NULL;

ALTER TABLE public.mission
  ALTER COLUMN start_at SET DEFAULT CURRENT_DATE,
  ALTER COLUMN start_at SET NOT NULL,
  ALTER COLUMN end_at SET NOT NULL;

-- ============================================================================
-- B. Opportunity : entry_average_price + closed_at
-- ============================================================================

ALTER TABLE public.opportunity
  ADD COLUMN IF NOT EXISTS entry_average_price numeric,
  ADD COLUMN IF NOT EXISTS closed_at date;

COMMENT ON COLUMN public.opportunity.entry_average_price IS
  'Montant pondéré figé à la création (price × probability / 100).';
COMMENT ON COLUMN public.opportunity.closed_at IS
  'Date (Europe/Paris) du passage à gagne ou perdue ; indépendante de end_at.';

-- Backfill entry_average_price pour lignes existantes
UPDATE public.opportunity
SET entry_average_price = COALESCE(price, 0) * probability_confirmation / 100
WHERE entry_average_price IS NULL;

-- Backfill closed_at pour opportunités déjà terminales
UPDATE public.opportunity
SET closed_at = COALESCE(end_at, (created_at AT TIME ZONE 'Europe/Paris')::date)
WHERE kanban_status IN ('gagne', 'perdue')
  AND closed_at IS NULL;

UPDATE public.opportunity
SET end_at = COALESCE(end_at, closed_at, (created_at AT TIME ZONE 'Europe/Paris')::date)
WHERE kanban_status IN ('gagne', 'perdue')
  AND end_at IS NULL;

ALTER TABLE public.opportunity
  DROP CONSTRAINT IF EXISTS opportunity_closed_requires_end_at;

ALTER TABLE public.opportunity
  ADD CONSTRAINT opportunity_closed_requires_end_at CHECK (
    kanban_status NOT IN ('gagne', 'perdue') OR end_at IS NOT NULL
  );

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

  -- closed_at + end_at à la clôture
  IF NEW.kanban_status IN ('gagne', 'perdue') THEN
    IF TG_OP = 'INSERT'
       OR OLD.kanban_status IS DISTINCT FROM NEW.kanban_status THEN
      NEW.closed_at := v_today;
    END IF;
    IF NEW.end_at IS NULL THEN
      NEW.end_at := COALESCE(NEW.closed_at, v_today);
    END IF;
  ELSIF TG_OP = 'UPDATE'
        AND OLD.kanban_status IN ('gagne', 'perdue')
        AND NEW.kanban_status NOT IN ('gagne', 'perdue') THEN
    NEW.closed_at := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- C. category_business + re-pointage FK jonctions métier
-- ============================================================================

CREATE TABLE public.category_business (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label       text NOT NULL UNIQUE,
  is_private  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.category_business IS
  'Catégories métier (pôles, clients, missions, opportunités).';
COMMENT ON COLUMN public.category_business.is_private IS
  'Si true : invisible Collaborateur ; entités liées masquées (RLS + cascade).';

ALTER TABLE public.mission_category
  DROP CONSTRAINT IF EXISTS mission_category_category_id_fkey;
ALTER TABLE public.mission_category
  ADD CONSTRAINT mission_category_category_id_fkey
  FOREIGN KEY (category_id) REFERENCES public.category_business(id) ON DELETE CASCADE;

ALTER TABLE public.opportunity_category
  DROP CONSTRAINT IF EXISTS opportunity_category_category_id_fkey;
ALTER TABLE public.opportunity_category
  ADD CONSTRAINT opportunity_category_category_id_fkey
  FOREIGN KEY (category_id) REFERENCES public.category_business(id) ON DELETE CASCADE;

ALTER TABLE public.client_category
  DROP CONSTRAINT IF EXISTS client_category_category_id_fkey;
ALTER TABLE public.client_category
  ADD CONSTRAINT client_category_category_id_fkey
  FOREIGN KEY (category_id) REFERENCES public.category_business(id) ON DELETE CASCADE;

ALTER TABLE public.team_category
  DROP CONSTRAINT IF EXISTS team_category_category_id_fkey;
ALTER TABLE public.team_category
  ADD CONSTRAINT team_category_category_id_fkey
  FOREIGN KEY (category_id) REFERENCES public.category_business(id) ON DELETE CASCADE;

-- Audit entity_type
ALTER TABLE public.audit_log
  DROP CONSTRAINT IF EXISTS audit_log_entity_type_check;

ALTER TABLE public.audit_log
  ADD CONSTRAINT audit_log_entity_type_check CHECK (
    entity_type = ANY (ARRAY[
      'category', 'category_business', 'team', 'collaborator', 'client', 'contact_client',
      'opportunity', 'mission', 'mission_series', 'document_type', 'document',
      'tool', 'tool_access', 'tool_subscription', 'tool_subscription_price',
      'exchange_rate', 'wiki', 'setting', 'note'
    ]::text[])
  );

CREATE TRIGGER trg_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.category_business
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

-- ============================================================================
-- D. Helpers privatisation
-- ============================================================================

CREATE OR REPLACE FUNCTION public.has_private_business_category(
  p_kind text,
  p_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE p_kind
    WHEN 'client' THEN EXISTS (
      SELECT 1
      FROM public.client_category cc
      JOIN public.category_business cb ON cb.id = cc.category_id
      WHERE cc.client_id = p_id AND cb.is_private = true
    )
    WHEN 'team' THEN EXISTS (
      SELECT 1
      FROM public.team_category tc
      JOIN public.category_business cb ON cb.id = tc.category_id
      WHERE tc.team_id = p_id AND cb.is_private = true
    )
    WHEN 'mission' THEN EXISTS (
      SELECT 1
      FROM public.mission_category mc
      JOIN public.category_business cb ON cb.id = mc.category_id
      WHERE mc.mission_id = p_id AND cb.is_private = true
    )
    WHEN 'opportunity' THEN EXISTS (
      SELECT 1
      FROM public.opportunity_category oc
      JOIN public.category_business cb ON cb.id = oc.category_id
      WHERE oc.opportunity_id = p_id AND cb.is_private = true
    )
    ELSE false
  END;
$$;

CREATE OR REPLACE FUNCTION public.can_access_client(p_client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_active_collaborator()
    AND (
      public.is_manager_or_direction()
      OR NOT public.has_private_business_category('client', p_client_id)
    );
$$;

CREATE OR REPLACE FUNCTION public.can_access_team(p_team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_active_collaborator()
    AND (
      public.is_manager_or_direction()
      OR NOT public.has_private_business_category('team', p_team_id)
    );
$$;

CREATE OR REPLACE FUNCTION public.can_access_opportunity(p_opportunity_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_active_collaborator()
    AND (
      public.is_manager_or_direction()
      OR (
        NOT public.has_private_business_category('opportunity', p_opportunity_id)
        AND EXISTS (
          SELECT 1 FROM public.opportunity o
          WHERE o.id = p_opportunity_id
            AND public.can_access_client(o.client_id)
        )
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.can_access_mission(p_mission_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_active_collaborator()
    AND (
      public.is_manager_or_direction()
      OR (
        NOT public.has_private_business_category('mission', p_mission_id)
        AND EXISTS (
          SELECT 1 FROM public.mission m
          WHERE m.id = p_mission_id
            AND (m.client_id IS NULL OR public.can_access_client(m.client_id))
            AND (m.opportunity_id IS NULL OR public.can_access_opportunity(m.opportunity_id))
        )
      )
    );
$$;

-- Libellé pôle même si privé (affichage cartes Collaborateurs Top10)
CREATE OR REPLACE FUNCTION public.team_name_for_display(p_team_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.team_name FROM public.team t WHERE t.id = p_team_id;
$$;

REVOKE ALL ON FUNCTION public.has_private_business_category(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_client(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_team(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_opportunity(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_mission(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.team_name_for_display(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.has_private_business_category(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_client(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_team(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_opportunity(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_mission(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.team_name_for_display(uuid) TO authenticated;

-- ============================================================================
-- E. RLS category_business + entités
-- ============================================================================

ALTER TABLE public.category_business ENABLE ROW LEVEL SECURITY;

CREATE POLICY "category_business_select" ON public.category_business
  FOR SELECT USING (
    public.is_active_collaborator()
    AND (is_private = false OR public.is_manager_or_direction())
  );

CREATE POLICY "category_business_insert_active" ON public.category_business
  FOR INSERT WITH CHECK (public.is_active_collaborator());

CREATE POLICY "category_business_update" ON public.category_business
  FOR UPDATE USING (
    public.is_active_collaborator()
    AND (is_private = false OR public.is_manager_or_direction())
  ) WITH CHECK (
    public.is_active_collaborator()
    AND (is_private = false OR public.is_manager_or_direction())
  );

CREATE POLICY "category_business_delete_public" ON public.category_business
  FOR DELETE USING (
    public.is_active_collaborator()
    AND is_private = false
  );

CREATE POLICY "category_business_delete_private" ON public.category_business
  FOR DELETE USING (
    public.is_active_collaborator()
    AND is_private = true
    AND public.is_manager_or_direction()
  );

CREATE OR REPLACE FUNCTION public.enforce_category_business_privacy_change()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_private = true
       AND public.current_collaborator_role() NOT IN ('manager', 'direction') THEN
      RAISE EXCEPTION 'Seuls un Manager ou la Direction peuvent créer une catégorie métier privée.';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.is_private IS DISTINCT FROM OLD.is_private
     AND public.current_collaborator_role() NOT IN ('manager', 'direction') THEN
    RAISE EXCEPTION 'Seuls un Manager ou la Direction peuvent modifier la visibilité d''une catégorie métier.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_enforce_category_business_privacy_change
  BEFORE INSERT OR UPDATE ON public.category_business
  FOR EACH ROW EXECUTE FUNCTION public.enforce_category_business_privacy_change();

-- Bloquer cat. privée sur pôle tant qu'il reste des Collaborateurs
CREATE OR REPLACE FUNCTION public.enforce_team_private_category_members()
RETURNS trigger AS $$
DECLARE
  v_is_private boolean;
BEGIN
  SELECT cb.is_private INTO v_is_private
  FROM public.category_business cb
  WHERE cb.id = NEW.category_id;

  IF COALESCE(v_is_private, false) THEN
    IF EXISTS (
      SELECT 1 FROM public.collaborator c
      WHERE c.team_id = NEW.team_id
        AND c.role = 'collaborator'
    ) THEN
      RAISE EXCEPTION 'Impossible d''ajouter une catégorie privée : des Collaborateurs sont encore membres de ce pôle.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_enforce_team_private_category_members
  BEFORE INSERT OR UPDATE ON public.team_category
  FOR EACH ROW EXECUTE FUNCTION public.enforce_team_private_category_members();

-- Interdire Collaborateur dans un pôle privé
CREATE OR REPLACE FUNCTION public.enforce_collaborator_not_on_private_team()
RETURNS trigger AS $$
BEGIN
  IF NEW.team_id IS NOT NULL
     AND NEW.role = 'collaborator'
     AND public.has_private_business_category('team', NEW.team_id) THEN
    RAISE EXCEPTION 'Un Collaborateur ne peut pas être membre d''un pôle ayant une catégorie privée.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_enforce_collaborator_not_on_private_team
  BEFORE INSERT OR UPDATE OF team_id, role ON public.collaborator
  FOR EACH ROW EXECUTE FUNCTION public.enforce_collaborator_not_on_private_team();

-- Replace entity policies
DROP POLICY IF EXISTS "client_select_active" ON public.client;
DROP POLICY IF EXISTS "client_update_active" ON public.client;
CREATE POLICY "client_select_active" ON public.client
  FOR SELECT USING (public.can_access_client(id));
CREATE POLICY "client_update_active" ON public.client
  FOR UPDATE USING (public.can_access_client(id))
  WITH CHECK (public.can_access_client(id));

DROP POLICY IF EXISTS "team_select_active" ON public.team;
DROP POLICY IF EXISTS "team_update_active" ON public.team;
DROP POLICY IF EXISTS "team_delete_manager_direction" ON public.team;
CREATE POLICY "team_select_active" ON public.team
  FOR SELECT USING (public.can_access_team(id));
CREATE POLICY "team_update_active" ON public.team
  FOR UPDATE USING (public.can_access_team(id))
  WITH CHECK (public.can_access_team(id));
CREATE POLICY "team_delete_manager_direction" ON public.team
  FOR DELETE USING (
    public.can_access_team(id)
    AND public.is_manager_or_direction()
  );

DROP POLICY IF EXISTS "mission_select_active" ON public.mission;
DROP POLICY IF EXISTS "mission_update_active" ON public.mission;
CREATE POLICY "mission_select_active" ON public.mission
  FOR SELECT USING (public.can_access_mission(id));
CREATE POLICY "mission_update_active" ON public.mission
  FOR UPDATE USING (public.can_access_mission(id))
  WITH CHECK (public.can_access_mission(id));

DROP POLICY IF EXISTS "opportunity_select_active" ON public.opportunity;
DROP POLICY IF EXISTS "opportunity_update_active" ON public.opportunity;
CREATE POLICY "opportunity_select_active" ON public.opportunity
  FOR SELECT USING (public.can_access_opportunity(id));
CREATE POLICY "opportunity_update_active" ON public.opportunity
  FOR UPDATE USING (public.can_access_opportunity(id))
  WITH CHECK (public.can_access_opportunity(id));

DROP POLICY IF EXISTS "contact_client_select_active" ON public.contact_client;
DROP POLICY IF EXISTS "contact_client_update_active" ON public.contact_client;
DROP POLICY IF EXISTS "contact_client_delete_active" ON public.contact_client;
CREATE POLICY "contact_client_select_active" ON public.contact_client
  FOR SELECT USING (public.can_access_client(client_id));
CREATE POLICY "contact_client_update_active" ON public.contact_client
  FOR UPDATE USING (public.can_access_client(client_id))
  WITH CHECK (public.can_access_client(client_id));
CREATE POLICY "contact_client_delete_active" ON public.contact_client
  FOR DELETE USING (public.can_access_client(client_id));

-- Documents : masqués si liés à un parent inaccessible
CREATE OR REPLACE FUNCTION public.can_access_document(p_document_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_active_collaborator()
    AND (
      public.is_manager_or_direction()
      OR (
        NOT EXISTS (
          SELECT 1 FROM public.client_document cd
          WHERE cd.document_id = p_document_id
            AND NOT public.can_access_client(cd.client_id)
        )
        AND NOT EXISTS (
          SELECT 1 FROM public.mission_document md
          WHERE md.document_id = p_document_id
            AND NOT public.can_access_mission(md.mission_id)
        )
        AND NOT EXISTS (
          SELECT 1 FROM public.opportunity_document od
          WHERE od.document_id = p_document_id
            AND NOT public.can_access_opportunity(od.opportunity_id)
        )
      )
    );
$$;

REVOKE ALL ON FUNCTION public.can_access_document(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_document(uuid) TO authenticated;

DROP POLICY IF EXISTS "document_select_active" ON public.document;
DROP POLICY IF EXISTS "document_update_active" ON public.document;
DROP POLICY IF EXISTS "document_delete_active" ON public.document;
CREATE POLICY "document_select_active" ON public.document
  FOR SELECT USING (public.can_access_document(id));
CREATE POLICY "document_update_active" ON public.document
  FOR UPDATE USING (public.can_access_document(id))
  WITH CHECK (public.can_access_document(id));
CREATE POLICY "document_delete_active" ON public.document
  FOR DELETE USING (public.can_access_document(id));

-- ============================================================================
-- F. Settings preferred_mission_category_ids
-- ============================================================================

ALTER TABLE public.setting
  ADD COLUMN IF NOT EXISTS preferred_mission_category_ids uuid[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.setting.preferred_mission_category_ids IS
  'Catégories métier préférées pour préfiltre /missions (AND) ; vide = aucun filtre.';

-- ============================================================================
-- G. search_global — filtres privatisation
-- ============================================================================

CREATE OR REPLACE FUNCTION public.search_global(
  p_query text,
  p_limit integer DEFAULT 20
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
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tsquery tsquery;
  v_limit integer := GREATEST(1, LEAST(COALESCE(p_limit, 20), 50));
  v_can_see_private boolean := public.is_manager_or_direction();
  v_words text[];
  v_prefix_query text;
BEGIN
  IF p_query IS NULL OR btrim(p_query) = '' THEN
    RETURN;
  END IF;

  v_words := regexp_split_to_array(btrim(p_query), '\s+');
  v_prefix_query := array_to_string(
    ARRAY(
      SELECT word || ':*'
      FROM unnest(v_words) AS word
      WHERE word <> ''
    ),
    ' & '
  );

  IF v_prefix_query IS NULL OR v_prefix_query = '' THEN
    RETURN;
  END IF;

  BEGIN
    v_tsquery := to_tsquery('french', v_prefix_query);
  EXCEPTION
    WHEN OTHERS THEN
      RETURN;
  END;

  RETURN QUERY
  (
    SELECT 'client'::text, c.id, c.client_name,
           CASE WHEN c.is_active THEN 'Client actif' ELSE 'Client inactif' END,
           ts_rank(c.search_vector, v_tsquery)
    FROM public.client c
    WHERE c.search_vector @@ v_tsquery
      AND (v_can_see_private OR NOT public.has_private_business_category('client', c.id))

    UNION ALL

    SELECT 'contact_client', cc.client_id,
           trim(both FROM cc.first_name || ' ' || cc.last_name),
           coalesce(cl.client_name, coalesce(cc.job_title, 'Contact client')),
           ts_rank(cc.search_vector, v_tsquery)
    FROM public.contact_client cc
    LEFT JOIN public.client cl ON cl.id = cc.client_id
    WHERE cc.search_vector @@ v_tsquery
      AND (v_can_see_private OR NOT public.has_private_business_category('client', cc.client_id))

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
      AND (v_can_see_private OR NOT public.has_private_business_category('team', t.id))

    UNION ALL

    SELECT 'opportunity', o.id, o.opportunity_name, 'Opportunité'::text,
           ts_rank(o.search_vector, v_tsquery)
    FROM public.opportunity o
    WHERE o.search_vector @@ v_tsquery
      AND (
        v_can_see_private
        OR (
          NOT public.has_private_business_category('opportunity', o.id)
          AND NOT public.has_private_business_category('client', o.client_id)
        )
      )

    UNION ALL

    SELECT 'mission', m.id, m.mission_name, 'Mission'::text,
           ts_rank(m.search_vector, v_tsquery)
    FROM public.mission m
    WHERE m.search_vector @@ v_tsquery
      AND (
        v_can_see_private
        OR (
          NOT public.has_private_business_category('mission', m.id)
          AND (m.client_id IS NULL OR NOT public.has_private_business_category('client', m.client_id))
          AND (
            m.opportunity_id IS NULL
            OR (
              NOT public.has_private_business_category('opportunity', m.opportunity_id)
              AND EXISTS (
                SELECT 1 FROM public.opportunity ox
                WHERE ox.id = m.opportunity_id
                  AND NOT public.has_private_business_category('client', ox.client_id)
              )
            )
          )
        )
      )

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
      AND public.can_access_document(d.id)

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

-- Privilèges table category_business
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.category_business
  TO anon, authenticated, service_role;
