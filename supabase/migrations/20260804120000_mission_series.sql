-- TOPilot — Séries de missions récurrentes

CREATE TYPE public.mission_recurrence_frequency AS ENUM (
  'mensuelle',
  'trimestrielle',
  'annuelle'
);

CREATE TABLE public.mission_series (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  frequency   public.mission_recurrence_frequency NOT NULL,
  starts_on   date NOT NULL,
  ends_on     date,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz,
  CONSTRAINT mission_series_ends_on_coherence CHECK (
    ends_on IS NULL OR ends_on >= starts_on
  )
);

CREATE INDEX idx_mission_series_active
  ON public.mission_series (ends_on, starts_on);

ALTER TABLE public.mission
  ADD COLUMN series_id uuid REFERENCES public.mission_series(id) ON DELETE SET NULL;

CREATE INDEX idx_mission_series_id ON public.mission(series_id);

CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.mission_series
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.mission_series ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mission_series_select_active"
  ON public.mission_series FOR SELECT
  USING (public.is_active_collaborator());

CREATE POLICY "mission_series_insert_active"
  ON public.mission_series FOR INSERT
  WITH CHECK (public.is_active_collaborator());

CREATE POLICY "mission_series_update_active"
  ON public.mission_series FOR UPDATE
  USING (public.is_active_collaborator())
  WITH CHECK (public.is_active_collaborator());

GRANT USAGE ON TYPE public.mission_recurrence_frequency
  TO anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mission_series
  TO anon, authenticated, service_role;

COMMENT ON TABLE public.mission_series IS
  'Règle de récurrence partagée par les occurrences mission (génération cron J-10).';
COMMENT ON COLUMN public.mission.series_id IS
  'Série de récurrence ; null = mission non récurrente.';
COMMENT ON COLUMN public.mission_series.ends_on IS
  'Fin de série (nullable = ouverte jusqu''à Arrêter).';
