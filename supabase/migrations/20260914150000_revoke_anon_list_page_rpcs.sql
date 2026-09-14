-- Aligne les grants list_*_page : authenticated uniquement (pas anon).
-- Les helpers RLS (is_active_collaborator, can_access_*) restent refusés à anon ;
-- un refresh post-logout ne doit pas appeler ces RPC en anon.

REVOKE ALL ON FUNCTION public.list_opportunities_page(
  integer, integer, boolean, uuid, uuid, uuid, uuid[], text[], text, text, text, boolean, text
) FROM anon;

REVOKE ALL ON FUNCTION public.list_missions_page(
  integer, integer, boolean, uuid, uuid, uuid, uuid[], text, text[], date, date, date, date, text
) FROM anon;

GRANT EXECUTE ON FUNCTION public.list_opportunities_page(
  integer, integer, boolean, uuid, uuid, uuid, uuid[], text[], text, text, text, boolean, text
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.list_missions_page(
  integer, integer, boolean, uuid, uuid, uuid, uuid[], text, text[], date, date, date, date, text
) TO authenticated;
