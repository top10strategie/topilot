-- ============================================================================
-- TOPilot — Type « Photo de profil » + bucket Storage visuels
-- ============================================================================

INSERT INTO public.document_type (label)
VALUES ('Photo de profil')
ON CONFLICT (label) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'visuels',
  'visuels',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/avif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
