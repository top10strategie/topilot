-- ============================================================================
-- TOPilot — Durcissement sécurité
-- 1. document_latest : security_invoker (respecte RLS de document)
-- 2. search_path figé sur helpers / triggers / FTS flagged advisor
-- 3. REVOKE EXECUTE des SECURITY DEFINER non destinés au client API
-- ============================================================================

-- 1. Vue document_latest : appliquer les droits de l'appelant (RLS can_access_document)
ALTER VIEW public.document_latest SET (security_invoker = true);

-- 2. search_path mutable → public
ALTER FUNCTION public.is_active_collaborator() SET search_path = public;
ALTER FUNCTION public.current_collaborator_role() SET search_path = public;
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.set_mission_archived_at() SET search_path = public;
ALTER FUNCTION public.set_opportunity_kanban_defaults() SET search_path = public;
ALTER FUNCTION public.close_previous_subscription_price() SET search_path = public;
ALTER FUNCTION public.enforce_contact_client_main() SET search_path = public;
ALTER FUNCTION public.promote_next_contact_client_main() SET search_path = public;
ALTER FUNCTION public.delete_document_version(uuid) SET search_path = public;
ALTER FUNCTION public.delete_document_lineage(uuid) SET search_path = public;
ALTER FUNCTION public.anonymize_collaborator(uuid) SET search_path = public;
ALTER FUNCTION public.anonymize_contact_client(uuid) SET search_path = public;
ALTER FUNCTION public.fts_french(text) SET search_path = public;
ALTER FUNCTION public.fts_french_tags(text[]) SET search_path = public;

-- 3a. Triggers / helpers internes : pas d'appel RPC client
REVOKE ALL ON FUNCTION public.audit_trigger_fn() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.audit_notes_trigger_fn() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_default_setting_for_collaborator() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_category_business_privacy_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_collaborator_not_on_private_team() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_collaborator_sensitive_fields() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_team_private_category_members() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_tool_access_privacy_change() FROM PUBLIC, anon, authenticated;

-- 3b. Vault : service_role uniquement (déjà GRANTé en migration vault)
REVOKE ALL ON FUNCTION public.insert_secret(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.read_secret(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_secret(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_secret(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.insert_secret(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_secret(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_secret(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_secret(text, text) TO service_role;

-- 3c. Helpers RLS / recherche : authenticated seulement (pas anon)
REVOKE ALL ON FUNCTION public.is_active_collaborator() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_collaborator_role() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_manager_or_direction() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_private_business_category(text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_access_client(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_access_team(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_access_opportunity(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_access_mission(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_access_document(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.team_name_for_display(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.search_global(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_collaborator() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_collaborator_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_manager_or_direction() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_private_business_category(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_client(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_team(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_opportunity(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_mission(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_document(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.team_name_for_display(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_global(text, integer) TO authenticated;

-- get_auth_gate_state reste accessible à anon + authenticated (middleware login)
