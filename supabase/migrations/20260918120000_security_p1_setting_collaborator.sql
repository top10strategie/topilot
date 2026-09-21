-- ============================================================================
-- TOPilot — Sécurité P1 : setting (must_change_password) + collaborator UPDATE
-- ============================================================================

-- Identifiant du collaborateur actif de la session courante
CREATE OR REPLACE FUNCTION public.current_collaborator_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.collaborator
  WHERE auth_user_id = auth.uid()
    AND status = 'actif';
$$;

REVOKE ALL ON FUNCTION public.current_collaborator_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_collaborator_id() TO authenticated;

-- ---------------------------------------------------------------------------
-- setting : portée = sa propre ligne ; must_change_password figé hors service_role
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "setting_select_active" ON public.setting;
DROP POLICY IF EXISTS "setting_insert_active" ON public.setting;
DROP POLICY IF EXISTS "setting_update_active" ON public.setting;
DROP POLICY IF EXISTS "setting_delete_active" ON public.setting;

CREATE POLICY "setting_select_own" ON public.setting
  FOR SELECT USING (
    public.is_active_collaborator()
    AND collaborator_id = public.current_collaborator_id()
  );

-- Pas de policy INSERT/DELETE pour authenticated :
-- la ligne est créée par trg_create_default_setting (SECURITY DEFINER).

CREATE POLICY "setting_update_own" ON public.setting
  FOR UPDATE USING (
    public.is_active_collaborator()
    AND collaborator_id = public.current_collaborator_id()
  ) WITH CHECK (
    public.is_active_collaborator()
    AND collaborator_id = public.current_collaborator_id()
  );

CREATE OR REPLACE FUNCTION public.enforce_setting_must_change_password()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.must_change_password IS DISTINCT FROM true
       AND coalesce(auth.role(), '') <> 'service_role' THEN
      RAISE EXCEPTION
        'must_change_password ne peut être défini à false que via service role.';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.must_change_password IS DISTINCT FROM OLD.must_change_password
     AND coalesce(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION
      'must_change_password ne peut être modifié que via service role.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_setting_must_change_password ON public.setting;
CREATE TRIGGER trg_enforce_setting_must_change_password
  BEFORE INSERT OR UPDATE ON public.setting
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_setting_must_change_password();

REVOKE ALL ON FUNCTION public.enforce_setting_must_change_password() FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- collaborator : UPDATE self vs Manager/Direction ; auth_user_id immuable
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "collaborator_update_active" ON public.collaborator;

CREATE POLICY "collaborator_update_self" ON public.collaborator
  FOR UPDATE USING (
    public.is_active_collaborator()
    AND auth_user_id = auth.uid()
  ) WITH CHECK (
    public.is_active_collaborator()
    AND auth_user_id = auth.uid()
  );

CREATE POLICY "collaborator_update_manager_direction" ON public.collaborator
  FOR UPDATE USING (
    public.is_active_collaborator()
    AND public.is_manager_or_direction()
  ) WITH CHECK (
    public.is_active_collaborator()
    AND public.is_manager_or_direction()
  );

CREATE OR REPLACE FUNCTION public.enforce_collaborator_auth_user_id_immutable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id THEN
    RAISE EXCEPTION 'auth_user_id d''un collaborateur ne peut pas être modifié.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_collaborator_auth_user_id_immutable
  ON public.collaborator;
CREATE TRIGGER trg_enforce_collaborator_auth_user_id_immutable
  BEFORE UPDATE ON public.collaborator
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_collaborator_auth_user_id_immutable();

REVOKE ALL ON FUNCTION public.enforce_collaborator_auth_user_id_immutable() FROM PUBLIC;
