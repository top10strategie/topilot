-- ============================================================================
-- TOPilot — Migration 08 : trigger générique set_updated_at + attachement des
-- triggers d'audit génériques (audit_trigger_fn / audit_notes_trigger_fn,
-- définis en migration 06) sur toutes les tables concernées.
-- Source : 04_database_schema.mdc (corrigé)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- set_updated_at() — générique
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- À appliquer sur : team, tool, collaborator, client, contact_client, opportunity,
-- mission, document, tool_access, tool_subscription, wiki, setting.
CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.team
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.tool
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.collaborator
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.client
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.contact_client
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.opportunity
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.mission
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.document
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.tool_access
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.tool_subscription
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.wiki
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.setting
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Trigger d'audit générique — sur les 16 tables listées dans audit_log.entity_type
-- (à l'exception de la valeur 'note', gérée séparément ci-dessous).
-- Jamais sur audit_log elle-même, ni sur les tables de jonction.
-- ----------------------------------------------------------------------------
CREATE TRIGGER trg_audit AFTER INSERT OR UPDATE OR DELETE ON public.category
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
CREATE TRIGGER trg_audit AFTER INSERT OR UPDATE OR DELETE ON public.team
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
CREATE TRIGGER trg_audit AFTER INSERT OR UPDATE OR DELETE ON public.collaborator
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
CREATE TRIGGER trg_audit AFTER INSERT OR UPDATE OR DELETE ON public.client
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
CREATE TRIGGER trg_audit AFTER INSERT OR UPDATE OR DELETE ON public.contact_client
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
CREATE TRIGGER trg_audit AFTER INSERT OR UPDATE OR DELETE ON public.opportunity
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
CREATE TRIGGER trg_audit AFTER INSERT OR UPDATE OR DELETE ON public.mission
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
CREATE TRIGGER trg_audit AFTER INSERT OR UPDATE OR DELETE ON public.document_type
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
CREATE TRIGGER trg_audit AFTER INSERT OR UPDATE OR DELETE ON public.document
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
CREATE TRIGGER trg_audit AFTER INSERT OR UPDATE OR DELETE ON public.tool
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
CREATE TRIGGER trg_audit AFTER INSERT OR UPDATE OR DELETE ON public.tool_access
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
CREATE TRIGGER trg_audit AFTER INSERT OR UPDATE OR DELETE ON public.tool_subscription
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
CREATE TRIGGER trg_audit AFTER INSERT OR UPDATE OR DELETE ON public.tool_subscription_price
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
CREATE TRIGGER trg_audit AFTER INSERT OR UPDATE OR DELETE ON public.exchange_rate
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
CREATE TRIGGER trg_audit AFTER INSERT OR UPDATE OR DELETE ON public.wiki
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
CREATE TRIGGER trg_audit AFTER INSERT OR UPDATE OR DELETE ON public.setting
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

-- ----------------------------------------------------------------------------
-- Trigger d'audit dédié aux notes — sur les 4 tables qui en disposent,
-- en complément du trigger générique déjà attaché ci-dessus sur ces tables.
-- ----------------------------------------------------------------------------
CREATE TRIGGER trg_audit_notes AFTER UPDATE ON public.client
  FOR EACH ROW EXECUTE FUNCTION public.audit_notes_trigger_fn();
CREATE TRIGGER trg_audit_notes AFTER UPDATE ON public.mission
  FOR EACH ROW EXECUTE FUNCTION public.audit_notes_trigger_fn();
CREATE TRIGGER trg_audit_notes AFTER UPDATE ON public.team
  FOR EACH ROW EXECUTE FUNCTION public.audit_notes_trigger_fn();
CREATE TRIGGER trg_audit_notes AFTER UPDATE ON public.contact_client
  FOR EACH ROW EXECUTE FUNCTION public.audit_notes_trigger_fn();
