-- ============================================================================
-- TOPilot — Restaurer EXECUTE sur les fonctions de triggers pour authenticated
-- Cause : 20260806180000_security_hardening a REVOKE EXECUTE FROM authenticated
-- sur des fonctions appelées par des triggers. PostgreSQL exige EXECUTE pour le
-- rôle qui déclenche le trigger, même si la fonction est SECURITY DEFINER.
-- Symptôme : INSERT/UPDATE/DELETE (mission, tool_access, etc.) → permission denied.
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.audit_trigger_fn() TO authenticated;
GRANT EXECUTE ON FUNCTION public.audit_notes_trigger_fn() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_default_setting_for_collaborator() TO authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_category_business_privacy_change() TO authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_collaborator_not_on_private_team() TO authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_collaborator_sensitive_fields() TO authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_team_private_category_members() TO authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_tool_access_privacy_change() TO authenticated;
