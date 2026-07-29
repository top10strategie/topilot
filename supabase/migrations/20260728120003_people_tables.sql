-- ============================================================================
-- TOPilot — Migration 03 : collaborator, client, contact_client
-- Source : 04_database_schema.mdc (corrigé)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- collaborator
-- ----------------------------------------------------------------------------
CREATE TABLE public.collaborator (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id        uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE RESTRICT,
  first_name          text NOT NULL,
  last_name           text NOT NULL,
  email               text NOT NULL UNIQUE,
  role                public.collaborator_role_enum NOT NULL,
  status              public.collaborator_status_enum NOT NULL DEFAULT 'actif',
  team_id             uuid NOT NULL REFERENCES public.team(id) ON DELETE RESTRICT,
  job_title           text NOT NULL,
  profile_picture_id  uuid REFERENCES public.document(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz
);

CREATE INDEX idx_collaborator_team_id ON public.collaborator(team_id);
CREATE INDEX idx_collaborator_profile_picture_id ON public.collaborator(profile_picture_id);

-- collaborator n'est jamais supprimé physiquement — offboarding via anonymisation.
CREATE OR REPLACE FUNCTION public.anonymize_collaborator(p_id uuid)
RETURNS void AS $$
  UPDATE public.collaborator
  SET first_name = 'Anonyme', last_name = 'Anonyme',
      email = 'anonyme-' || p_id || '@deleted.local',
      status = 'sorti', profile_picture_id = NULL
  WHERE id = p_id;
$$ LANGUAGE sql;

-- ----------------------------------------------------------------------------
-- client
-- ----------------------------------------------------------------------------
CREATE TABLE public.client (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name           text NOT NULL,
  main_collaborator_id  uuid NOT NULL REFERENCES public.collaborator(id) ON DELETE RESTRICT,
  website               text NOT NULL,
  address_street        text,
  address_city          text,
  address_zip           text,
  address_country       text NOT NULL DEFAULT 'France',
  drive_link            text,
  logo_id               uuid REFERENCES public.document(id) ON DELETE SET NULL,
  is_active             boolean NOT NULL DEFAULT true,
  notes                 text,
  notes_updated_at      timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz
);

CREATE INDEX idx_client_main_collaborator_id ON public.client(main_collaborator_id);
CREATE INDEX idx_client_logo_id ON public.client(logo_id);

-- ----------------------------------------------------------------------------
-- contact_client
-- ----------------------------------------------------------------------------
CREATE TABLE public.contact_client (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id          uuid NOT NULL REFERENCES public.client(id) ON DELETE RESTRICT,
  first_name         text NOT NULL,
  last_name          text NOT NULL,
  job_title          text,
  is_main            boolean NOT NULL DEFAULT false,
  notes              text,
  notes_updated_at   timestamptz,
  profile_picture_id uuid REFERENCES public.document(id) ON DELETE SET NULL,
  phone_number       text,
  email_address      text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz
);

CREATE INDEX idx_contact_client_client_id ON public.contact_client(client_id);
CREATE INDEX idx_contact_client_profile_picture_id ON public.contact_client(profile_picture_id);

-- Un seul contact principal par client (filet de sécurité en base, cf. triggers ci-dessous).
CREATE UNIQUE INDEX uq_contact_client_main_per_client
  ON public.contact_client (client_id)
  WHERE is_main = true;

CREATE OR REPLACE FUNCTION public.anonymize_contact_client(p_id uuid)
RETURNS void AS $$
  UPDATE public.contact_client
  SET first_name = 'Anonyme', last_name = 'Anonyme',
      phone_number = NULL, email_address = NULL, profile_picture_id = NULL
  WHERE id = p_id;
$$ LANGUAGE sql;

-- Premier contact du client => principal automatique ; unicité du principal garantie.
CREATE OR REPLACE FUNCTION public.enforce_contact_client_main()
RETURNS trigger AS $$
BEGIN
  -- Premier contact du client : devient automatiquement principal, quelle que soit la valeur fournie.
  IF NOT EXISTS (
    SELECT 1 FROM public.contact_client
    WHERE client_id = NEW.client_id AND id <> NEW.id
  ) THEN
    NEW.is_main := true;
  END IF;

  -- Empêche de retirer le statut principal du seul contact principal existant sans qu'un autre ne le devienne.
  IF TG_OP = 'UPDATE' AND OLD.is_main = true AND NEW.is_main = false THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.contact_client
      WHERE client_id = NEW.client_id AND id <> NEW.id AND is_main = true
    ) THEN
      RAISE EXCEPTION 'Un client doit toujours avoir un contact principal : désignez-en un autre avant de retirer celui-ci.';
    END IF;
  END IF;

  -- Si ce contact devient (ou reste) principal, désactiver le précédent principal du même client.
  IF NEW.is_main THEN
    UPDATE public.contact_client
    SET is_main = false
    WHERE client_id = NEW.client_id
      AND id <> NEW.id
      AND is_main = true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_contact_client_main
BEFORE INSERT OR UPDATE ON public.contact_client
FOR EACH ROW EXECUTE FUNCTION public.enforce_contact_client_main();

-- Promotion automatique du contact restant le plus ancien si le contact principal est supprimé.
CREATE OR REPLACE FUNCTION public.promote_next_contact_client_main()
RETURNS trigger AS $$
BEGIN
  IF OLD.is_main THEN
    UPDATE public.contact_client
    SET is_main = true
    WHERE id = (
      SELECT id FROM public.contact_client
      WHERE client_id = OLD.client_id
      ORDER BY created_at ASC
      LIMIT 1
    );
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_promote_next_contact_client_main
AFTER DELETE ON public.contact_client
FOR EACH ROW EXECUTE FUNCTION public.promote_next_contact_client_main();
