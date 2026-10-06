-- ============================================================================
-- public.update_secret : plus d'UPDATE direct sur vault.secrets
-- (postgres / service_role n'ont pas le privilège UPDATE sur cette table).
-- Passer par vault.update_secret / vault.create_secret (SECURITY DEFINER).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_secret(secret_name text, secret_value text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_id uuid;
BEGIN
  SELECT s.id INTO v_id
  FROM vault.secrets s
  WHERE s.name = secret_name;

  IF v_id IS NULL THEN
    PERFORM vault.create_secret(secret_value, secret_name);
  ELSE
    PERFORM vault.update_secret(v_id, secret_value);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.update_secret(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_secret(text, text) TO service_role;
