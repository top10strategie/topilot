-- ============================================================================
-- TOPilot — Migration 11 : get_auth_gate_state() pour le middleware Next.js
-- Permet de lire statut collaborateur + must_change_password hors policies RLS
-- (ex. utilisateur inactif qui ne peut pas SELECT sur collaborator/setting).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_auth_gate_state()
RETURNS TABLE (
  collaborator_id uuid,
  status public.collaborator_status_enum,
  must_change_password boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.status,
    COALESCE(s.must_change_password, true)
  FROM public.collaborator c
  LEFT JOIN public.setting s ON s.collaborator_id = c.id
  WHERE c.auth_user_id = auth.uid()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_auth_gate_state() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_auth_gate_state() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_auth_gate_state() TO anon;
