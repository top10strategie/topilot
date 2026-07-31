-- RPC Vault pour toolbox (référence par nom, service_role uniquement)
CREATE OR REPLACE FUNCTION public.insert_secret(secret_name text, secret_value text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
BEGIN
  RETURN vault.create_secret(secret_value, secret_name);
END;
$$;

CREATE OR REPLACE FUNCTION public.read_secret(secret_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  secret_value text;
BEGIN
  SELECT decrypted_secret INTO secret_value
  FROM vault.decrypted_secrets
  WHERE name = secret_name;
  RETURN secret_value;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_secret(secret_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
BEGIN
  DELETE FROM vault.secrets WHERE name = secret_name;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_secret(secret_name text, secret_value text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
BEGIN
  UPDATE vault.secrets
  SET secret = secret_value
  WHERE name = secret_name;
  IF NOT FOUND THEN
    PERFORM vault.create_secret(secret_value, secret_name);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.insert_secret(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.read_secret(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_secret(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_secret(text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.insert_secret(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_secret(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_secret(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_secret(text, text) TO service_role;
