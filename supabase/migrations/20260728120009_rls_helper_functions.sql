-- ============================================================================
-- TOPilot — Migration 09 : fonctions helper RLS
-- Source : 05_security_rls.mdc
-- Doivent être créées après `collaborator` (migration 03) et avant toute
-- policy RLS qui les référence (migration 10).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_active_collaborator()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.collaborator
    WHERE auth_user_id = auth.uid() AND status = 'actif'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.current_collaborator_role()
RETURNS public.collaborator_role_enum AS $$
  SELECT role FROM public.collaborator
  WHERE auth_user_id = auth.uid() AND status = 'actif';
$$ LANGUAGE sql STABLE SECURITY DEFINER;
