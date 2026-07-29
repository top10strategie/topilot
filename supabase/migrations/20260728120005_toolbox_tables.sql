-- ============================================================================
-- TOPilot — Migration 05 : tool_access, tool_subscription, tool_subscription_price
-- Source : 04_database_schema.mdc (corrigé)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- tool_access
-- ----------------------------------------------------------------------------
CREATE TABLE public.tool_access (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id           uuid NOT NULL REFERENCES public.tool(id) ON DELETE RESTRICT,
  client_id         uuid REFERENCES public.client(id) ON DELETE RESTRICT,
  label             text NOT NULL,
  identifier        text NOT NULL,
  vault_secret_id   text NOT NULL,
  is_private        boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz
);

CREATE INDEX idx_tool_access_tool_id ON public.tool_access(tool_id);
CREATE INDEX idx_tool_access_client_id ON public.tool_access(client_id);

-- La bascule is_private est protégée au niveau base (en plus des policies RLS, cf. migration 10).
CREATE OR REPLACE FUNCTION public.enforce_tool_access_privacy_change()
RETURNS trigger AS $$
BEGIN
  IF NEW.is_private IS DISTINCT FROM OLD.is_private
     AND public.current_collaborator_role() NOT IN ('manager', 'direction') THEN
    RAISE EXCEPTION 'Seuls un Manager ou la Direction peuvent modifier la visibilité d''un accès outil.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_enforce_tool_access_privacy_change
BEFORE UPDATE ON public.tool_access
FOR EACH ROW EXECUTE FUNCTION public.enforce_tool_access_privacy_change();

-- ----------------------------------------------------------------------------
-- tool_subscription
-- ----------------------------------------------------------------------------
CREATE TABLE public.tool_subscription (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id             uuid NOT NULL REFERENCES public.tool(id) ON DELETE RESTRICT,
  title               text NOT NULL,
  subscription_plan   public.tool_subscription_plan_enum NOT NULL DEFAULT 'mensuel',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz
);

CREATE INDEX idx_tool_subscription_tool_id ON public.tool_subscription(tool_id);

-- ----------------------------------------------------------------------------
-- tool_subscription_price
-- ----------------------------------------------------------------------------
CREATE TABLE public.tool_subscription_price (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_subscription_id   uuid NOT NULL REFERENCES public.tool_subscription(id) ON DELETE RESTRICT,
  currency               text NOT NULL DEFAULT 'EUR' CHECK (currency ~ '^[A-Z]{3}$'),
  amount                 integer NOT NULL CHECK (amount > 0),
  valid_from             date NOT NULL,
  valid_to               date CHECK (valid_to IS NULL OR valid_to > valid_from),
  created_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tool_subscription_price_subscription_id
  ON public.tool_subscription_price(tool_subscription_id);

-- Filet de sécurité en base : une seule ligne "active" (valid_to IS NULL) par abonnement et par devise.
CREATE UNIQUE INDEX uq_tool_subscription_price_active
  ON public.tool_subscription_price (tool_subscription_id, currency)
  WHERE valid_to IS NULL;

-- La fermeture ne cible que la même devise : un abonnement peut avoir un tarif actif par devise en parallèle.
CREATE OR REPLACE FUNCTION public.close_previous_subscription_price()
RETURNS trigger AS $$
BEGIN
  UPDATE public.tool_subscription_price
  SET valid_to = NEW.valid_from - INTERVAL '1 day'
  WHERE tool_subscription_id = NEW.tool_subscription_id
    AND currency = NEW.currency
    AND valid_to IS NULL
    AND id <> NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_close_previous_subscription_price
AFTER INSERT ON public.tool_subscription_price
FOR EACH ROW EXECUTE FUNCTION public.close_previous_subscription_price();
