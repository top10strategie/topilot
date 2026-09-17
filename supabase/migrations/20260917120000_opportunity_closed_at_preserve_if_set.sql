-- closed_at: ne poser la date du jour à la clôture que si encore NULL
-- (saisie manuelle « Début de la facturation » conservée).

CREATE OR REPLACE FUNCTION public.set_opportunity_kanban_defaults()
RETURNS trigger AS $$
DECLARE
  v_mapped_probability numeric;
  v_today date := (now() AT TIME ZONE 'Europe/Paris')::date;
BEGIN
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

  IF NEW.kanban_status IN ('gagne', 'perdue') THEN
    NEW.is_active := false;
  ELSIF TG_OP = 'UPDATE' AND OLD.kanban_status IN ('gagne', 'perdue') THEN
    NEW.is_active := true;
  END IF;

  -- Snapshot montant pondéré à la création uniquement
  IF TG_OP = 'INSERT' THEN
    NEW.entry_average_price :=
      COALESCE(NEW.price, 0) * NEW.probability_confirmation / 100;
  END IF;

  -- closed_at à la clôture / réouverture (end_at = fin de facturation, non géré ici)
  -- Ne remplace pas une date déjà saisie (Début de la facturation).
  IF NEW.kanban_status IN ('gagne', 'perdue') THEN
    IF TG_OP = 'INSERT'
       OR OLD.kanban_status IS DISTINCT FROM NEW.kanban_status THEN
      IF NEW.closed_at IS NULL THEN
        NEW.closed_at := v_today;
      END IF;
    END IF;
  ELSIF TG_OP = 'UPDATE'
        AND OLD.kanban_status IN ('gagne', 'perdue')
        AND NEW.kanban_status NOT IN ('gagne', 'perdue') THEN
    NEW.closed_at := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

ALTER FUNCTION public.set_opportunity_kanban_defaults() SET search_path = public;

COMMENT ON COLUMN public.opportunity.closed_at IS
  'Début de facturation (date Paris). Saisissable en édition ; auto-rempli à gagne/perdue uniquement si NULL ; vidé à la réouverture.';
