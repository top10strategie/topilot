-- ============================================================================
-- TOPilot — Migration 06 : setting, audit_log
-- Source : 04_database_schema.mdc (corrigé — inclut le trigger d'auto-création
-- de `setting` ajouté suite à l'audit de cohérence)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- setting
-- ----------------------------------------------------------------------------
CREATE TABLE public.setting (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collaborator_id        uuid NOT NULL UNIQUE REFERENCES public.collaborator(id) ON DELETE RESTRICT,
  theme                  public.theme_enum NOT NULL DEFAULT 'systeme',
  must_change_password   boolean NOT NULL DEFAULT true,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz
);

CREATE INDEX idx_setting_collaborator_id ON public.setting(collaborator_id);

-- Création automatique d'une ligne setting (valeurs par défaut) à chaque nouveau collaborateur,
-- quel que soit le point d'entrée de l'INSERT (server action ou Dashboard Supabase).
CREATE OR REPLACE FUNCTION public.create_default_setting_for_collaborator()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.setting (collaborator_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_create_default_setting
AFTER INSERT ON public.collaborator
FOR EACH ROW EXECUTE FUNCTION public.create_default_setting_for_collaborator();

-- ----------------------------------------------------------------------------
-- audit_log (écriture uniquement via triggers SECURITY DEFINER, jamais côté client)
-- ----------------------------------------------------------------------------
CREATE TABLE public.audit_log (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collaborator_id  uuid REFERENCES public.collaborator(id) ON DELETE RESTRICT,
  entity_type      text NOT NULL CHECK (entity_type = ANY (ARRAY[
                      'category', 'team', 'collaborator', 'client', 'contact_client',
                      'opportunity', 'mission', 'document_type', 'document',
                      'tool', 'tool_access', 'tool_subscription', 'tool_subscription_price',
                      'exchange_rate', 'wiki', 'setting', 'note'
                    ]::text[])),
  entity_id        uuid NOT NULL,
  action           public.audit_action_enum NOT NULL,
  label            text NOT NULL,
  old_value        jsonb,
  new_value        jsonb,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_collaborator_id ON public.audit_log(collaborator_id);
CREATE INDEX idx_audit_log_entity ON public.audit_log(entity_type, entity_id);

-- Fonction générique d'historisation (attachée aux 16 tables concernées en migration 08).
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
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Historisation dédiée des notes : uniquement quand le champ `notes` change,
-- sur les 4 tables qui en disposent (client, mission, team, contact_client).
-- Attachée en migration 08, en complément du trigger générique ci-dessus.
CREATE OR REPLACE FUNCTION public.audit_notes_trigger_fn()
RETURNS trigger AS $$
DECLARE
  v_collaborator_id uuid;
BEGIN
  IF NEW.notes IS NOT DISTINCT FROM OLD.notes THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_collaborator_id
  FROM public.collaborator
  WHERE auth_user_id = auth.uid();

  INSERT INTO public.audit_log (collaborator_id, entity_type, entity_id, action, label, old_value, new_value)
  VALUES (
    v_collaborator_id,
    'note',
    NEW.id,
    'UPDATE',
    format('Modification de note sur %s', TG_TABLE_NAME),
    to_jsonb(OLD.notes),
    to_jsonb(NEW.notes)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
