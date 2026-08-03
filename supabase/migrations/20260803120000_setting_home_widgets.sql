-- TOPilot — Préférences Home widgets sur setting

ALTER TABLE public.setting
  ADD COLUMN IF NOT EXISTS home_widgets text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.setting.home_widgets IS
  'Identifiants de widgets Home dans l''ordre d''affichage (catalogue fermé).';
