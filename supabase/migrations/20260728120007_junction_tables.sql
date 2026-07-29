-- ============================================================================
-- TOPilot — Migration 07 : tables de jonction (M2M)
-- Source : 04_database_schema.mdc (corrigé)
-- ============================================================================

CREATE TABLE public.mission_category (
  mission_id   uuid NOT NULL REFERENCES public.mission(id) ON DELETE CASCADE,
  category_id  uuid NOT NULL REFERENCES public.category(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (mission_id, category_id)
);
CREATE INDEX idx_mission_category_category_id ON public.mission_category(category_id);

CREATE TABLE public.mission_document (
  mission_id   uuid NOT NULL REFERENCES public.mission(id) ON DELETE CASCADE,
  document_id  uuid NOT NULL REFERENCES public.document(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (mission_id, document_id)
);
CREATE INDEX idx_mission_document_document_id ON public.mission_document(document_id);

CREATE TABLE public.mission_tool (
  mission_id   uuid NOT NULL REFERENCES public.mission(id) ON DELETE CASCADE,
  tool_id      uuid NOT NULL REFERENCES public.tool(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (mission_id, tool_id)
);
CREATE INDEX idx_mission_tool_tool_id ON public.mission_tool(tool_id);

CREATE TABLE public.mission_wiki (
  mission_id   uuid NOT NULL REFERENCES public.mission(id) ON DELETE CASCADE,
  wiki_id      uuid NOT NULL REFERENCES public.wiki(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (mission_id, wiki_id)
);
CREATE INDEX idx_mission_wiki_wiki_id ON public.mission_wiki(wiki_id);

CREATE TABLE public.opportunity_category (
  opportunity_id  uuid NOT NULL REFERENCES public.opportunity(id) ON DELETE CASCADE,
  category_id     uuid NOT NULL REFERENCES public.category(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (opportunity_id, category_id)
);
CREATE INDEX idx_opportunity_category_category_id ON public.opportunity_category(category_id);

CREATE TABLE public.opportunity_document (
  opportunity_id  uuid NOT NULL REFERENCES public.opportunity(id) ON DELETE CASCADE,
  document_id     uuid NOT NULL REFERENCES public.document(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (opportunity_id, document_id)
);
CREATE INDEX idx_opportunity_document_document_id ON public.opportunity_document(document_id);

CREATE TABLE public.opportunity_tool (
  opportunity_id   uuid NOT NULL REFERENCES public.opportunity(id) ON DELETE CASCADE,
  tool_id          uuid NOT NULL REFERENCES public.tool(id) ON DELETE CASCADE,
  created_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (opportunity_id, tool_id)
);
CREATE INDEX idx_opportunity_tool_tool_id ON public.opportunity_tool(tool_id);

CREATE TABLE public.client_category (
  client_id    uuid NOT NULL REFERENCES public.client(id) ON DELETE CASCADE,
  category_id  uuid NOT NULL REFERENCES public.category(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (client_id, category_id)
);
CREATE INDEX idx_client_category_category_id ON public.client_category(category_id);

CREATE TABLE public.client_document (
  client_id    uuid NOT NULL REFERENCES public.client(id) ON DELETE CASCADE,
  document_id  uuid NOT NULL REFERENCES public.document(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (client_id, document_id)
);
CREATE INDEX idx_client_document_document_id ON public.client_document(document_id);

CREATE TABLE public.client_tool (
  client_id   uuid NOT NULL REFERENCES public.client(id) ON DELETE CASCADE,
  tool_id     uuid NOT NULL REFERENCES public.tool(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (client_id, tool_id)
);
CREATE INDEX idx_client_tool_tool_id ON public.client_tool(tool_id);

CREATE TABLE public.client_wiki (
  client_id   uuid NOT NULL REFERENCES public.client(id) ON DELETE CASCADE,
  wiki_id     uuid NOT NULL REFERENCES public.wiki(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (client_id, wiki_id)
);
CREATE INDEX idx_client_wiki_wiki_id ON public.client_wiki(wiki_id);

CREATE TABLE public.tool_category (
  tool_id      uuid NOT NULL REFERENCES public.tool(id) ON DELETE CASCADE,
  category_id  uuid NOT NULL REFERENCES public.category(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tool_id, category_id)
);
CREATE INDEX idx_tool_category_category_id ON public.tool_category(category_id);

CREATE TABLE public.wiki_category (
  wiki_id      uuid NOT NULL REFERENCES public.wiki(id) ON DELETE CASCADE,
  category_id  uuid NOT NULL REFERENCES public.category(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (wiki_id, category_id)
);
CREATE INDEX idx_wiki_category_category_id ON public.wiki_category(category_id);

CREATE TABLE public.team_category (
  team_id      uuid NOT NULL REFERENCES public.team(id) ON DELETE CASCADE,
  category_id  uuid NOT NULL REFERENCES public.category(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, category_id)
);
CREATE INDEX idx_team_category_category_id ON public.team_category(category_id);
