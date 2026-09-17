-- ============================================================================
-- TOPilot — Objectifs de CA annuels (revenue_aim)
-- ============================================================================

CREATE TABLE public.revenue_aim (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amount numeric NOT NULL,
  year integer NOT NULL,
  CONSTRAINT revenue_aim_year_unique UNIQUE (year)
);

COMMENT ON TABLE public.revenue_aim IS 'Objectif de CA annuel (montant divisé par 12 pour la courbe mensuelle).';
COMMENT ON COLUMN public.revenue_aim.amount IS 'Objectif de CA annuel en euros (décimales autorisées).';
COMMENT ON COLUMN public.revenue_aim.year IS 'Année calendaire (unique).';

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.revenue_aim
  TO anon, authenticated, service_role;

ALTER TABLE public.revenue_aim ENABLE ROW LEVEL SECURITY;

CREATE POLICY "revenue_aim_select_active" ON public.revenue_aim
  FOR SELECT USING (public.is_active_collaborator());

CREATE POLICY "revenue_aim_insert_manager_direction" ON public.revenue_aim
  FOR INSERT WITH CHECK (
    public.is_active_collaborator()
    AND public.is_manager_or_direction()
  );

CREATE POLICY "revenue_aim_update_manager_direction" ON public.revenue_aim
  FOR UPDATE USING (
    public.is_active_collaborator()
    AND public.is_manager_or_direction()
  ) WITH CHECK (
    public.is_active_collaborator()
    AND public.is_manager_or_direction()
  );

CREATE POLICY "revenue_aim_delete_manager_direction" ON public.revenue_aim
  FOR DELETE USING (
    public.is_active_collaborator()
    AND public.is_manager_or_direction()
  );
