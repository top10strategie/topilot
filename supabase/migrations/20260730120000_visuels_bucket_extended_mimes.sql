-- ============================================================================
-- TOPilot — Élargir les MIME du bucket visuels (SVG, AVIF)
-- ============================================================================

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/avif'
]
WHERE id = 'visuels';
