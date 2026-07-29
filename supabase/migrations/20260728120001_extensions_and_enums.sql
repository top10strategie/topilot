-- ============================================================================
-- TOPilot — Migration 01 : Extensions & Enums
-- Source : 04_database_schema.mdc (corrigé) + 03_business_rules.mdc
-- ============================================================================

-- gen_random_uuid() dépend de pgcrypto (activée par défaut sur les projets Supabase)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- Enums (valeurs en snake_case sans accents — cf. 00_cursor_rules.mdc)
-- ----------------------------------------------------------------------------

CREATE TYPE public.collaborator_role_enum AS ENUM ('direction', 'manager', 'collaborator');

CREATE TYPE public.collaborator_status_enum AS ENUM ('actif', 'inactif', 'sorti');

CREATE TYPE public.theme_enum AS ENUM ('clair', 'sombre', 'systeme');

CREATE TYPE public.mission_scope_enum AS ENUM ('client', 'interne');

CREATE TYPE public.mission_kanban_status_enum AS ENUM (
  'a_faire', 'en_cours', 'terminee', 'archivee'
);

-- Ordre de déclaration = ordre d'affichage UI (cf. ux_architecture.md)
CREATE TYPE public.opportunity_kanban_status_enum AS ENUM (
  'suspect', 'prospect', 'besoin_specifie', 'proposition_envoyee', 'gagne', 'perdue'
);

CREATE TYPE public.opportunity_priority_enum AS ENUM (
  'faible', 'normal', 'urgente', 'prioritaire'
);

CREATE TYPE public.document_storage_type_enum AS ENUM ('supabase', 'url');

CREATE TYPE public.tool_subscription_plan_enum AS ENUM ('annuel', 'mensuel');

-- Miroir volontaire des valeurs TG_OP de Postgres (majuscules, exception au snake_case)
CREATE TYPE public.audit_action_enum AS ENUM ('INSERT', 'UPDATE', 'DELETE');
