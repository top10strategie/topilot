-- ============================================================================
-- TOPilot — Migration 10 : Row Level Security — activation + policies
-- Source : 05_security_rls.mdc (corrigé)
-- Nécessite : is_active_collaborator() et current_collaborator_role()
-- (migration 09).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Tables suivant strictement la règle par défaut
-- (SELECT/INSERT/UPDATE ouverts aux actifs ; DELETE ouvert aux actifs)
-- category, document_type, tool, wiki, document, contact_client,
-- tool_subscription, tool_subscription_price, setting
-- ----------------------------------------------------------------------------

-- category
ALTER TABLE public.category ENABLE ROW LEVEL SECURITY;
CREATE POLICY "category_select_active" ON public.category FOR SELECT USING (public.is_active_collaborator());
CREATE POLICY "category_insert_active" ON public.category FOR INSERT WITH CHECK (public.is_active_collaborator());
CREATE POLICY "category_update_active" ON public.category FOR UPDATE USING (public.is_active_collaborator()) WITH CHECK (public.is_active_collaborator());
CREATE POLICY "category_delete_active" ON public.category FOR DELETE USING (public.is_active_collaborator());

-- document_type
ALTER TABLE public.document_type ENABLE ROW LEVEL SECURITY;
CREATE POLICY "document_type_select_active" ON public.document_type FOR SELECT USING (public.is_active_collaborator());
CREATE POLICY "document_type_insert_active" ON public.document_type FOR INSERT WITH CHECK (public.is_active_collaborator());
CREATE POLICY "document_type_update_active" ON public.document_type FOR UPDATE USING (public.is_active_collaborator()) WITH CHECK (public.is_active_collaborator());
CREATE POLICY "document_type_delete_active" ON public.document_type FOR DELETE USING (public.is_active_collaborator());

-- tool
ALTER TABLE public.tool ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tool_select_active" ON public.tool FOR SELECT USING (public.is_active_collaborator());
CREATE POLICY "tool_insert_active" ON public.tool FOR INSERT WITH CHECK (public.is_active_collaborator());
CREATE POLICY "tool_update_active" ON public.tool FOR UPDATE USING (public.is_active_collaborator()) WITH CHECK (public.is_active_collaborator());
CREATE POLICY "tool_delete_active" ON public.tool FOR DELETE USING (public.is_active_collaborator());

-- wiki
ALTER TABLE public.wiki ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wiki_select_active" ON public.wiki FOR SELECT USING (public.is_active_collaborator());
CREATE POLICY "wiki_insert_active" ON public.wiki FOR INSERT WITH CHECK (public.is_active_collaborator());
CREATE POLICY "wiki_update_active" ON public.wiki FOR UPDATE USING (public.is_active_collaborator()) WITH CHECK (public.is_active_collaborator());
CREATE POLICY "wiki_delete_active" ON public.wiki FOR DELETE USING (public.is_active_collaborator());

-- document
ALTER TABLE public.document ENABLE ROW LEVEL SECURITY;
CREATE POLICY "document_select_active" ON public.document FOR SELECT USING (public.is_active_collaborator());
CREATE POLICY "document_insert_active" ON public.document FOR INSERT WITH CHECK (public.is_active_collaborator());
CREATE POLICY "document_update_active" ON public.document FOR UPDATE USING (public.is_active_collaborator()) WITH CHECK (public.is_active_collaborator());
CREATE POLICY "document_delete_active" ON public.document FOR DELETE USING (public.is_active_collaborator());

-- contact_client (aucune policy dédiée nécessaire, cf. 05_security_rls.mdc — règle par défaut)
ALTER TABLE public.contact_client ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contact_client_select_active" ON public.contact_client FOR SELECT USING (public.is_active_collaborator());
CREATE POLICY "contact_client_insert_active" ON public.contact_client FOR INSERT WITH CHECK (public.is_active_collaborator());
CREATE POLICY "contact_client_update_active" ON public.contact_client FOR UPDATE USING (public.is_active_collaborator()) WITH CHECK (public.is_active_collaborator());
CREATE POLICY "contact_client_delete_active" ON public.contact_client FOR DELETE USING (public.is_active_collaborator());

-- tool_subscription
ALTER TABLE public.tool_subscription ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tool_subscription_select_active" ON public.tool_subscription FOR SELECT USING (public.is_active_collaborator());
CREATE POLICY "tool_subscription_insert_active" ON public.tool_subscription FOR INSERT WITH CHECK (public.is_active_collaborator());
CREATE POLICY "tool_subscription_update_active" ON public.tool_subscription FOR UPDATE USING (public.is_active_collaborator()) WITH CHECK (public.is_active_collaborator());
CREATE POLICY "tool_subscription_delete_active" ON public.tool_subscription FOR DELETE USING (public.is_active_collaborator());

-- tool_subscription_price
ALTER TABLE public.tool_subscription_price ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tool_subscription_price_select_active" ON public.tool_subscription_price FOR SELECT USING (public.is_active_collaborator());
CREATE POLICY "tool_subscription_price_insert_active" ON public.tool_subscription_price FOR INSERT WITH CHECK (public.is_active_collaborator());
CREATE POLICY "tool_subscription_price_update_active" ON public.tool_subscription_price FOR UPDATE USING (public.is_active_collaborator()) WITH CHECK (public.is_active_collaborator());
CREATE POLICY "tool_subscription_price_delete_active" ON public.tool_subscription_price FOR DELETE USING (public.is_active_collaborator());

-- setting
ALTER TABLE public.setting ENABLE ROW LEVEL SECURITY;
CREATE POLICY "setting_select_active" ON public.setting FOR SELECT USING (public.is_active_collaborator());
CREATE POLICY "setting_insert_active" ON public.setting FOR INSERT WITH CHECK (public.is_active_collaborator());
CREATE POLICY "setting_update_active" ON public.setting FOR UPDATE USING (public.is_active_collaborator()) WITH CHECK (public.is_active_collaborator());
CREATE POLICY "setting_delete_active" ON public.setting FOR DELETE USING (public.is_active_collaborator());

-- ----------------------------------------------------------------------------
-- client, mission, opportunity : SELECT/INSERT/UPDATE par défaut, AUCUNE policy DELETE
-- ----------------------------------------------------------------------------

ALTER TABLE public.client ENABLE ROW LEVEL SECURITY;
CREATE POLICY "client_select_active" ON public.client FOR SELECT USING (public.is_active_collaborator());
CREATE POLICY "client_insert_active" ON public.client FOR INSERT WITH CHECK (public.is_active_collaborator());
CREATE POLICY "client_update_active" ON public.client FOR UPDATE USING (public.is_active_collaborator()) WITH CHECK (public.is_active_collaborator());
-- Aucune policy DELETE : suppression physique impossible, cf. 03_business_rules.mdc.

ALTER TABLE public.mission ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mission_select_active" ON public.mission FOR SELECT USING (public.is_active_collaborator());
CREATE POLICY "mission_insert_active" ON public.mission FOR INSERT WITH CHECK (public.is_active_collaborator());
CREATE POLICY "mission_update_active" ON public.mission FOR UPDATE USING (public.is_active_collaborator()) WITH CHECK (public.is_active_collaborator());
-- Aucune policy DELETE.

ALTER TABLE public.opportunity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "opportunity_select_active" ON public.opportunity FOR SELECT USING (public.is_active_collaborator());
CREATE POLICY "opportunity_insert_active" ON public.opportunity FOR INSERT WITH CHECK (public.is_active_collaborator());
CREATE POLICY "opportunity_update_active" ON public.opportunity FOR UPDATE USING (public.is_active_collaborator()) WITH CHECK (public.is_active_collaborator());
-- Aucune policy DELETE.

-- ----------------------------------------------------------------------------
-- team : par défaut en SELECT/INSERT/UPDATE, DELETE réservé Manager/Direction
-- ----------------------------------------------------------------------------

ALTER TABLE public.team ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team_select_active" ON public.team FOR SELECT USING (public.is_active_collaborator());
CREATE POLICY "team_insert_active" ON public.team FOR INSERT WITH CHECK (public.is_active_collaborator());
CREATE POLICY "team_update_active" ON public.team FOR UPDATE USING (public.is_active_collaborator()) WITH CHECK (public.is_active_collaborator());
CREATE POLICY "team_delete_manager_direction" ON public.team
  FOR DELETE USING (
    public.is_active_collaborator()
    AND public.current_collaborator_role() IN ('manager', 'direction')
  );

-- ----------------------------------------------------------------------------
-- exchange_rate : SELECT actifs ; AUCUNE policy INSERT/UPDATE (service role
-- uniquement, via server actions / cron) ; DELETE ouvert aux actifs.
-- ----------------------------------------------------------------------------

ALTER TABLE public.exchange_rate ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exchange_rate_select_active" ON public.exchange_rate FOR SELECT USING (public.is_active_collaborator());
CREATE POLICY "exchange_rate_delete_active" ON public.exchange_rate FOR DELETE USING (public.is_active_collaborator());
-- Aucune policy INSERT/UPDATE : seul le service role (qui contourne RLS) peut écrire.

-- ----------------------------------------------------------------------------
-- collaborator : INSERT réservé Manager/Direction (correction post-audit),
-- SELECT/UPDATE par défaut (champs sensibles role/status protégés par trigger
-- dédié), AUCUNE policy DELETE (offboarding via anonymize_collaborator).
-- ----------------------------------------------------------------------------

ALTER TABLE public.collaborator ENABLE ROW LEVEL SECURITY;

CREATE POLICY "collaborator_select_active" ON public.collaborator
  FOR SELECT USING (public.is_active_collaborator());

-- Corrigé suite à l'audit : policy INSERT par défaut remplacée pour éviter
-- une élévation de privilège (un Collaborateur ne doit pas pouvoir créer
-- une ligne collaborator avec role = 'direction'). Bootstrap du tout premier
-- collaborateur : à faire manuellement via le Dashboard Supabase (hors RLS).
CREATE POLICY "collaborator_insert_manager_direction" ON public.collaborator
  FOR INSERT WITH CHECK (
    public.is_active_collaborator()
    AND public.current_collaborator_role() IN ('manager', 'direction')
  );

CREATE POLICY "collaborator_update_active" ON public.collaborator
  FOR UPDATE USING (public.is_active_collaborator()) WITH CHECK (public.is_active_collaborator());
-- Aucune policy DELETE.

-- Protection des champs sensibles (role, status) au niveau base, en complément de la RLS.
CREATE OR REPLACE FUNCTION public.enforce_collaborator_sensitive_fields()
RETURNS trigger AS $$
BEGIN
  IF (NEW.role IS DISTINCT FROM OLD.role
      OR NEW.status IS DISTINCT FROM OLD.status)
     AND public.current_collaborator_role() NOT IN ('manager', 'direction') THEN
    RAISE EXCEPTION 'Seuls un Manager ou la Direction peuvent modifier le rôle ou le statut d''un collaborateur.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_enforce_collaborator_sensitive_fields
BEFORE UPDATE ON public.collaborator
FOR EACH ROW EXECUTE FUNCTION public.enforce_collaborator_sensitive_fields();

-- ----------------------------------------------------------------------------
-- tool_access : SELECT/UPDATE filtrés sur is_private (corrigé post-audit pour
-- UPDATE), DELETE scindé en 2 policies selon is_private.
-- ----------------------------------------------------------------------------

ALTER TABLE public.tool_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tool_access_select" ON public.tool_access
  FOR SELECT USING (
    public.is_active_collaborator()
    AND (is_private = false OR public.current_collaborator_role() IN ('manager', 'direction'))
  );

CREATE POLICY "tool_access_insert_active" ON public.tool_access
  FOR INSERT WITH CHECK (public.is_active_collaborator());

-- Corrigé suite à l'audit : alignée sur le même filtre que SELECT, pour éviter
-- une écriture aveugle sur un accès privé (label/identifier) par un Collaborateur
-- qui n'a pourtant pas le droit de le lire.
CREATE POLICY "tool_access_update_active" ON public.tool_access
  FOR UPDATE USING (
    public.is_active_collaborator()
    AND (is_private = false OR public.current_collaborator_role() IN ('manager', 'direction'))
  ) WITH CHECK (
    public.is_active_collaborator()
    AND (is_private = false OR public.current_collaborator_role() IN ('manager', 'direction'))
  );

CREATE POLICY "tool_access_delete_open" ON public.tool_access
  FOR DELETE USING (
    public.is_active_collaborator()
    AND is_private = false
  );

CREATE POLICY "tool_access_delete_private" ON public.tool_access
  FOR DELETE USING (
    public.is_active_collaborator()
    AND is_private = true
    AND public.current_collaborator_role() IN ('manager', 'direction')
  );

-- ----------------------------------------------------------------------------
-- audit_log : SELECT uniquement — écriture exclusivement via triggers
-- SECURITY DEFINER (audit_trigger_fn / audit_notes_trigger_fn, migration 06/08).
-- AUCUNE policy INSERT/UPDATE/DELETE.
-- ----------------------------------------------------------------------------

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_log_select_active" ON public.audit_log FOR SELECT USING (public.is_active_collaborator());

-- ----------------------------------------------------------------------------
-- Tables de jonction (M2M) : ouvertes en SELECT/INSERT/UPDATE/DELETE à tout
-- collaborateur actif.
-- ----------------------------------------------------------------------------

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'mission_category', 'mission_document', 'mission_tool', 'mission_wiki',
      'opportunity_category', 'opportunity_document', 'opportunity_tool',
      'client_category', 'client_document', 'client_tool', 'client_wiki',
      'tool_category', 'wiki_category', 'team_category'
    ])
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('CREATE POLICY "%s_select_active" ON public.%I FOR SELECT USING (public.is_active_collaborator());', t, t);
    EXECUTE format('CREATE POLICY "%s_insert_active" ON public.%I FOR INSERT WITH CHECK (public.is_active_collaborator());', t, t);
    EXECUTE format('CREATE POLICY "%s_update_active" ON public.%I FOR UPDATE USING (public.is_active_collaborator()) WITH CHECK (public.is_active_collaborator());', t, t);
    EXECUTE format('CREATE POLICY "%s_delete_active" ON public.%I FOR DELETE USING (public.is_active_collaborator());', t, t);
  END LOOP;
END $$;
