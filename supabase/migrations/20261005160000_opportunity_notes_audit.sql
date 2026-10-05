-- Historiser les notes d'opportunité comme les autres champs `notes`.
DROP TRIGGER IF EXISTS trg_audit_notes ON public.opportunity;
CREATE TRIGGER trg_audit_notes
  AFTER UPDATE ON public.opportunity
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_notes_trigger_fn();
