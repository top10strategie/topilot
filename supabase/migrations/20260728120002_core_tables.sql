-- ============================================================================
-- TOPilot — Migration 02 : Tables cœur (sans dépendance sur collaborator)
-- Source : 04_database_schema.mdc (corrigé)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- category
-- ----------------------------------------------------------------------------
CREATE TABLE public.category (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label       text NOT NULL UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- document_type
-- ----------------------------------------------------------------------------
CREATE TABLE public.document_type (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label       text NOT NULL UNIQUE,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- team
-- ----------------------------------------------------------------------------
CREATE TABLE public.team (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name          text NOT NULL UNIQUE,
  notes              text,
  notes_updated_at   timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz
);

-- ----------------------------------------------------------------------------
-- tool
-- ----------------------------------------------------------------------------
CREATE TABLE public.tool (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_name    text NOT NULL,
  url          text NOT NULL,
  description  text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz
);

-- ----------------------------------------------------------------------------
-- exchange_rate (taux mensuels, source API Frankfurter)
-- ----------------------------------------------------------------------------
CREATE TABLE public.exchange_rate (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  currency   text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  rate       numeric(18, 8) NOT NULL CHECK (rate > 0),
  date       timestamptz NOT NULL
);

CREATE UNIQUE INDEX uq_exchange_rate_currency_date ON public.exchange_rate (currency, date);
CREATE INDEX idx_exchange_rate_currency ON public.exchange_rate (currency);
CREATE INDEX idx_exchange_rate_date ON public.exchange_rate (date);

-- ----------------------------------------------------------------------------
-- wiki
-- ----------------------------------------------------------------------------
CREATE TABLE public.wiki (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  content_html  text NOT NULL,
  content_text  text NOT NULL,
  tags          text[] NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz
);

-- ----------------------------------------------------------------------------
-- document (+ versionning : vue document_latest, fonctions de suppression)
-- ----------------------------------------------------------------------------
CREATE TABLE public.document (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_name       text NOT NULL,
  document_type_id    uuid NOT NULL REFERENCES public.document_type(id) ON DELETE RESTRICT,
  storage_type        public.document_storage_type_enum NOT NULL,
  file_path           text,
  url                 text,
  is_visual           boolean NOT NULL DEFAULT false,
  version_number      integer NOT NULL DEFAULT 1 CHECK (version_number >= 1),
  parent_document_id  uuid REFERENCES public.document(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz,
  CONSTRAINT document_storage_coherence CHECK (
    (storage_type = 'supabase' AND file_path IS NOT NULL AND url IS NULL) OR
    (storage_type = 'url' AND url IS NOT NULL AND file_path IS NULL)
  )
);

CREATE INDEX idx_document_document_type_id ON public.document(document_type_id);
CREATE INDEX idx_document_parent_document_id ON public.document(parent_document_id);

-- Dernière version de chaque document, calculée dynamiquement (pas de colonne is_latest)
CREATE VIEW public.document_latest AS
SELECT DISTINCT ON (COALESCE(parent_document_id, id)) *
FROM public.document
ORDER BY COALESCE(parent_document_id, id), version_number DESC;

-- Mode 1 : supprime uniquement la version la plus récente d'une lignée.
CREATE OR REPLACE FUNCTION public.delete_document_version(p_document_id uuid)
RETURNS TABLE(file_path text) AS $$
DECLARE
  v_root_id uuid;
  v_this_version integer;
  v_max_version integer;
BEGIN
  SELECT COALESCE(parent_document_id, id), version_number
  INTO v_root_id, v_this_version
  FROM public.document
  WHERE id = p_document_id;

  IF v_root_id IS NULL THEN
    RAISE EXCEPTION 'Document introuvable.';
  END IF;

  SELECT max(version_number) INTO v_max_version
  FROM public.document
  WHERE id = v_root_id OR parent_document_id = v_root_id;

  IF v_this_version <> v_max_version THEN
    RAISE EXCEPTION 'Seule la version la plus récente peut être supprimée individuellement. Utilisez la suppression de la lignée entière pour retirer une version antérieure.';
  END IF;

  RETURN QUERY
  DELETE FROM public.document
  WHERE id = p_document_id
  RETURNING document.file_path;
END;
$$ LANGUAGE plpgsql;

-- Mode 2 : supprime toute la lignée (racine + toutes ses versions).
CREATE OR REPLACE FUNCTION public.delete_document_lineage(p_document_id uuid)
RETURNS TABLE(file_path text) AS $$
DECLARE
  v_root_id uuid;
BEGIN
  SELECT COALESCE(parent_document_id, id) INTO v_root_id
  FROM public.document
  WHERE id = p_document_id;

  IF v_root_id IS NULL THEN
    RAISE EXCEPTION 'Document introuvable.';
  END IF;

  RETURN QUERY
  DELETE FROM public.document
  WHERE id = v_root_id OR parent_document_id = v_root_id
  RETURNING document.file_path;
END;
$$ LANGUAGE plpgsql;
