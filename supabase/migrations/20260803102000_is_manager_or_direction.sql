-- ============================================================================
-- TOPilot — Helper is_manager_or_direction (utilisé par search_global)
-- La migration client_logo_type_and_contact_fts appelle cette fonction
-- sans l'avoir créée → recherche globale en erreur.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_manager_or_direction()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_collaborator_role() IN ('manager', 'direction');
$$;

REVOKE ALL ON FUNCTION public.is_manager_or_direction() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_manager_or_direction() TO authenticated;
