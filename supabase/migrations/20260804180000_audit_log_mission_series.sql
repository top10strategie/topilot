-- TOPilot — audit_log : ajouter mission_series

ALTER TABLE public.audit_log
  DROP CONSTRAINT IF EXISTS audit_log_entity_type_check;

ALTER TABLE public.audit_log
  ADD CONSTRAINT audit_log_entity_type_check CHECK (
    entity_type = ANY (ARRAY[
      'category', 'team', 'collaborator', 'client', 'contact_client',
      'opportunity', 'mission', 'mission_series', 'document_type', 'document',
      'tool', 'tool_access', 'tool_subscription', 'tool_subscription_price',
      'exchange_rate', 'wiki', 'setting', 'note'
    ]::text[])
  );

CREATE TRIGGER trg_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.mission_series
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
