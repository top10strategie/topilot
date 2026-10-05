-- ============================================================================
-- TOPilot — Sécurité audit P0 : Vault / audit_log / documents / visuels
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Redaction JSON d'audit (vault_secret_id, file_path, notes, identifier)
--    Les notes métier restent historisées via audit_notes_trigger_fn
--    (entity_type = 'note', payload = texte JSON, pas un objet à clés).
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.audit_redact_jsonb(p_value jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_value IS NULL THEN NULL
    WHEN jsonb_typeof(p_value) = 'object' THEN (
      SELECT COALESCE(jsonb_object_agg(key, public.audit_redact_jsonb(value)), '{}'::jsonb)
      FROM jsonb_each(p_value)
      WHERE key NOT IN ('vault_secret_id', 'file_path', 'notes', 'identifier')
    )
    WHEN jsonb_typeof(p_value) = 'array' THEN (
      SELECT COALESCE(jsonb_agg(public.audit_redact_jsonb(elem)), '[]'::jsonb)
      FROM jsonb_array_elements(p_value) AS elem
    )
    ELSE p_value
  END
$$;

REVOKE ALL ON FUNCTION public.audit_redact_jsonb(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.audit_redact_jsonb(jsonb) TO postgres, service_role;

CREATE OR REPLACE FUNCTION public.audit_trigger_fn()
RETURNS trigger AS $$
DECLARE
  v_collaborator_id uuid;
  v_entity_id uuid;
BEGIN
  SELECT id INTO v_collaborator_id
  FROM public.collaborator
  WHERE auth_user_id = auth.uid();

  v_entity_id := COALESCE(NEW.id, OLD.id);

  INSERT INTO public.audit_log (collaborator_id, entity_type, entity_id, action, label, old_value, new_value)
  VALUES (
    v_collaborator_id,
    TG_TABLE_NAME,
    v_entity_id,
    TG_OP::public.audit_action_enum,
    format('%s sur %s', TG_OP, TG_TABLE_NAME),
    CASE
      WHEN TG_OP IN ('UPDATE', 'DELETE') THEN public.audit_redact_jsonb(to_jsonb(OLD))
      ELSE NULL
    END,
    CASE
      WHEN TG_OP IN ('INSERT', 'UPDATE') THEN public.audit_redact_jsonb(to_jsonb(NEW))
      ELSE NULL
    END
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

UPDATE public.audit_log
SET
  old_value = public.audit_redact_jsonb(old_value),
  new_value = public.audit_redact_jsonb(new_value)
WHERE old_value IS NOT NULL OR new_value IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 2. SELECT audit_log : Manager / Direction uniquement
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "audit_log_select_active" ON public.audit_log;
CREATE POLICY "audit_log_select_manager_direction" ON public.audit_log
  FOR SELECT USING (
    public.is_active_collaborator()
    AND public.is_manager_or_direction()
  );

-- ----------------------------------------------------------------------------
-- 3. vault_secret_id unique + non lisible via PostgREST authenticated/anon
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.tool_access
    GROUP BY vault_secret_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Impossible d''ajouter UNIQUE(vault_secret_id) : doublons existants.';
  END IF;
END $$;

ALTER TABLE public.tool_access
  ADD CONSTRAINT tool_access_vault_secret_id_key UNIQUE (vault_secret_id);

REVOKE SELECT (vault_secret_id) ON public.tool_access FROM anon, authenticated;

-- ----------------------------------------------------------------------------
-- 4. document.file_path doit appartenir à la ligne (id/…)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.document_file_path_owns_row(p_id uuid, p_path text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_path IS NULL
    OR p_path = 'pending'
    OR p_path LIKE p_id::text || '/%';
$$;

REVOKE ALL ON FUNCTION public.document_file_path_owns_row(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.document_file_path_owns_row(uuid, text) TO authenticated, postgres;

DROP POLICY IF EXISTS "document_insert_active" ON public.document;
CREATE POLICY "document_insert_active" ON public.document
  FOR INSERT WITH CHECK (
    public.is_active_collaborator()
    AND public.document_file_path_owns_row(id, file_path)
  );

DROP POLICY IF EXISTS "document_update_active" ON public.document;
CREATE POLICY "document_update_active" ON public.document
  FOR UPDATE
  USING (public.can_access_document(id))
  WITH CHECK (
    public.can_access_document(id)
    AND public.document_file_path_owns_row(id, file_path)
  );

-- ----------------------------------------------------------------------------
-- 5. Bucket visuels : plus de SVG (nouveaux uploads)
-- ----------------------------------------------------------------------------

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif'
]
WHERE id = 'visuels';
