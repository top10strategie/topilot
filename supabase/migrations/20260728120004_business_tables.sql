-- ============================================================================
-- TOPilot — Migration 04 : opportunity, mission
-- Source : 04_database_schema.mdc (corrigé)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- opportunity
-- ----------------------------------------------------------------------------
CREATE TABLE public.opportunity (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_name          text NOT NULL,
  client_id                 uuid NOT NULL REFERENCES public.client(id) ON DELETE RESTRICT,
  contact_client_id         uuid REFERENCES public.contact_client(id) ON DELETE SET NULL,
  collaborator_id           uuid NOT NULL REFERENCES public.collaborator(id) ON DELETE RESTRICT,
  price                     numeric,
  probability_confirmation  numeric NOT NULL DEFAULT 10
                              CHECK (probability_confirmation >= 0 AND probability_confirmation <= 100),
  average_price             numeric GENERATED ALWAYS AS (price * probability_confirmation / 100) STORED,
  kanban_status             public.opportunity_kanban_status_enum NOT NULL,
  kanban_order              int,
  is_active                 boolean NOT NULL DEFAULT true,
  priority                  public.opportunity_priority_enum NOT NULL DEFAULT 'normal', -- libellé UI "Urgence"
  notes                     text,
  notes_updated_at          timestamptz,
  action                    text,
  source                    text,
  last_meeting_at           date,
  due_date_at               date,
  end_at                    date,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz,
  CONSTRAINT opportunity_due_or_end_required CHECK (due_date_at IS NOT NULL OR end_at IS NOT NULL)
);

CREATE INDEX idx_opportunity_client_id ON public.opportunity(client_id);
CREATE INDEX idx_opportunity_contact_client_id ON public.opportunity(contact_client_id);
CREATE INDEX idx_opportunity_collaborator_id ON public.opportunity(collaborator_id);

-- Mapping fixe statut -> probabilité par défaut :
-- suspect=10, prospect=30, besoin_specifie=50, proposition_envoyee=75, gagne=100, perdue=0
CREATE OR REPLACE FUNCTION public.set_opportunity_kanban_defaults()
RETURNS trigger AS $$
DECLARE
  v_mapped_probability numeric;
BEGIN
  -- À la création : kanban_status par défaut selon l'historique du client
  -- (déjà des missions ou opportunités => besoin_specifie, sinon => suspect).
  IF TG_OP = 'INSERT' THEN
    IF EXISTS (
      SELECT 1 FROM public.mission WHERE client_id = NEW.client_id
      UNION ALL
      SELECT 1 FROM public.opportunity WHERE client_id = NEW.client_id
    ) THEN
      NEW.kanban_status := 'besoin_specifie';
    ELSE
      NEW.kanban_status := 'suspect';
    END IF;
  END IF;

  -- À la création ou dès que le statut change : la probabilité ne peut que monter
  -- jusqu'à la valeur mappée du nouveau statut, jamais redescendre en dessous.
  IF TG_OP = 'INSERT' OR NEW.kanban_status IS DISTINCT FROM OLD.kanban_status THEN
    v_mapped_probability := CASE NEW.kanban_status
      WHEN 'suspect' THEN 10
      WHEN 'prospect' THEN 30
      WHEN 'besoin_specifie' THEN 50
      WHEN 'proposition_envoyee' THEN 75
      WHEN 'gagne' THEN 100
      WHEN 'perdue' THEN 0
    END;

    IF TG_OP = 'INSERT' OR NEW.probability_confirmation < v_mapped_probability THEN
      NEW.probability_confirmation := v_mapped_probability;
    END IF;
  END IF;

  -- Les 2 statuts terminaux archivent automatiquement l'opportunité ;
  -- en sortir (déplacement arrière dans le Kanban) la désarchive symétriquement.
  IF NEW.kanban_status IN ('gagne', 'perdue') THEN
    NEW.is_active := false;
  ELSIF TG_OP = 'UPDATE' AND OLD.kanban_status IN ('gagne', 'perdue') THEN
    NEW.is_active := true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_opportunity_kanban_defaults
BEFORE INSERT OR UPDATE ON public.opportunity
FOR EACH ROW EXECUTE FUNCTION public.set_opportunity_kanban_defaults();

-- ----------------------------------------------------------------------------
-- mission
-- ----------------------------------------------------------------------------
CREATE TABLE public.mission (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_name      text NOT NULL,
  mission_scope     public.mission_scope_enum NOT NULL,
  client_id         uuid REFERENCES public.client(id) ON DELETE RESTRICT,
  collaborator_id   uuid NOT NULL REFERENCES public.collaborator(id) ON DELETE RESTRICT,
  opportunity_id    uuid REFERENCES public.opportunity(id) ON DELETE SET NULL,
  kanban_status     public.mission_kanban_status_enum NOT NULL DEFAULT 'a_faire',
  kanban_order      int,
  archived_at       timestamptz,
  completed_at      timestamptz,
  notes             text,
  notes_updated_at  timestamptz,
  estimated_charge  numeric CHECK (estimated_charge IS NULL OR estimated_charge >= 0),
  start_at          date,
  end_at            date,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz,
  CONSTRAINT mission_scope_client_coherence CHECK (
    (mission_scope = 'client' AND client_id IS NOT NULL) OR
    (mission_scope = 'interne' AND client_id IS NULL)
  )
);

CREATE INDEX idx_mission_client_id ON public.mission(client_id);
CREATE INDEX idx_mission_collaborator_id ON public.mission(collaborator_id);
CREATE INDEX idx_mission_opportunity_id ON public.mission(opportunity_id);

CREATE OR REPLACE FUNCTION public.set_mission_archived_at()
RETURNS trigger AS $$
BEGIN
  IF NEW.kanban_status = 'archivee' AND (TG_OP = 'INSERT' OR OLD.kanban_status IS DISTINCT FROM 'archivee') THEN
    NEW.archived_at := now();
  ELSIF NEW.kanban_status IS DISTINCT FROM 'archivee' THEN
    NEW.archived_at := NULL;
  END IF;

  IF NEW.kanban_status = 'terminee' AND (TG_OP = 'INSERT' OR OLD.kanban_status IS DISTINCT FROM 'terminee') THEN
    NEW.completed_at := now();
  ELSIF NEW.kanban_status IN ('a_faire', 'en_cours') THEN
    NEW.completed_at := NULL;
  END IF;
  -- Si NEW.kanban_status = 'archivee' : completed_at n'est pas touché ici, il conserve
  -- sa valeur précédente (NULL si jamais complétée, horodatage sinon).

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_mission_archived_at
BEFORE INSERT OR UPDATE ON public.mission
FOR EACH ROW EXECUTE FUNCTION public.set_mission_archived_at();
