-- Analyses KPI : sommes engagées (échéances gagnées année) / pondérées (ouverts),
-- missingEngageBillingCount, sumPrevisionnel.

CREATE OR REPLACE FUNCTION public.load_analyses_payload(
  p_opportunities boolean DEFAULT true,
  p_missions boolean DEFAULT true,
  p_subscriptions boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_paris date := (timezone('Europe/Paris', now()))::date;
  v_paris_year integer := extract(year FROM v_paris)::integer;
  v_paris_month integer := extract(month FROM v_paris)::integer;
  v_labels text[] := ARRAY[
    'Janv.','Févr.','Mars','Avr.','Mai','Juin',
    'Juil.','Août','Sept.','Oct.','Nov.','Déc.'
  ];
  v_opp jsonb := NULL;
  v_mis jsonb := NULL;
  v_sub jsonb := NULL;
  v_inst jsonb := '[]'::jsonb;
  v_cur_rows jsonb := '[]'::jsonb;
  v_tool_rows jsonb := '[]'::jsonb;
  v_cat_rows jsonb := '[]'::jsonb;
  v_years integer[];
  v_mission_years integer[];
  v_sub_years integer[];
  v_y integer;
  v_m integer;
  v_points jsonb;
  v_pipeline jsonb := '{}'::jsonb;
  v_teams jsonb := '{}'::jsonb;
  v_by_client jsonb := '{}'::jsonb;
  v_client_year jsonb;
  v_options jsonb;
  v_kpis jsonb;
  v_by_status jsonb;
  v_missing bigint;
  v_missing_engage bigint;
  v_aims jsonb;
  v_aims_by_year jsonb;
  v_count bigint;
  v_sum_price numeric;
  v_sum_avg numeric;
  v_sum_prev numeric;
  v_won bigint;
  v_prob numeric;
  v_mission_kpis jsonb;
  v_mission_status jsonb;
  v_mission_team jsonb;
  v_mission_pipeline jsonb;
  rec record;
  sched record;
  v_start date;
  v_bucket text;
  v_months integer[];
  v_idx integer;
  v_end_idx integer;
  v_step integer;
  v_cy integer;
  v_cm integer;
  v_last date;
  v_amount numeric;
  v_encoded integer;
  v_monthly numeric;
  v_n integer;
  v_share numeric;
  v_ym text;
  v_month_start date;
  v_month_end date;
  v_max_month integer;
  v_cat jsonb;
  v_currency jsonb := '{}'::jsonb;
  v_by_tool jsonb := '{}'::jsonb;
  v_by_cat jsonb := '{}'::jsonb;
  v_tmp jsonb;
  v_evo jsonb;
BEGIN
  IF coalesce(p_opportunities, true) THEN
    v_inst := '[]'::jsonb;
    v_sum_price := 0;
    v_sum_avg := 0;
    v_sum_prev := 0;

    SELECT
      count(*)::bigint,
      count(*) FILTER (WHERE o.kanban_status = 'gagne')
    INTO v_count, v_won
    FROM public.opportunity o
    WHERE (
      CASE
        WHEN o.kanban_status IN ('gagne', 'perdue')
          THEN extract(year FROM o.closed_at)::integer
        ELSE extract(year FROM o.due_date_at)::integer
      END
    ) = v_paris_year;

    SELECT coalesce(jsonb_agg(
      jsonb_build_object(
        'key', s.status,
        'label', s.label,
        'value', coalesce(c.cnt, 0)
      ) ORDER BY s.ord
    ), '[]'::jsonb)
    INTO v_by_status
    FROM (
      VALUES
        (1, 'suspect', 'Suspect'),
        (2, 'prospect', 'Prospect'),
        (3, 'besoin_specifie', 'Besoin spécifié'),
        (4, 'proposition_envoyee', 'Proposition envoyée'),
        (5, 'gagne', 'Gagné'),
        (6, 'perdue', 'Perdu')
    ) AS s(ord, status, label)
    LEFT JOIN (
      SELECT o.kanban_status::text AS status, count(*)::bigint AS cnt
      FROM public.opportunity o
      WHERE (
        CASE
          WHEN o.kanban_status IN ('gagne', 'perdue')
            THEN extract(year FROM o.closed_at)::integer
          ELSE extract(year FROM o.due_date_at)::integer
        END
      ) = v_paris_year
      GROUP BY o.kanban_status
    ) c ON c.status = s.status;

    SELECT count(*)::bigint
    INTO v_missing
    FROM public.opportunity o
    WHERE o.kanban_status <> 'perdue'
      AND (
        o.invoice_frequency IS NULL
        OR (
          o.invoice_frequency <> 'echellonne'
          AND o.end_at IS NULL
        )
        OR (
          o.invoice_frequency = 'echellonne'
          AND NOT EXISTS (
            SELECT 1
            FROM public.invoice_schedule s
            WHERE s.opportunity_id = o.id
          )
        )
      );

    SELECT count(*)::bigint
    INTO v_missing_engage
    FROM public.opportunity o
    WHERE o.kanban_status = 'gagne'
      AND (
        o.closed_at IS NULL
        OR extract(year FROM o.closed_at)::integer = v_paris_year
      )
      AND (
        o.invoice_frequency IS NULL
        OR (
          o.invoice_frequency <> 'echellonne'
          AND o.end_at IS NULL
        )
        OR (
          o.invoice_frequency = 'echellonne'
          AND NOT EXISTS (
            SELECT 1
            FROM public.invoice_schedule s
            WHERE s.opportunity_id = o.id
          )
        )
      );

    FOR rec IN
      SELECT
        o.id,
        o.price,
        o.kanban_status,
        o.due_date_at,
        o.closed_at,
        o.end_at,
        o.invoice_frequency,
        o.client_id,
        c.client_name,
        coalesce(t.team_name, 'Sans pôle') AS team_label,
        EXISTS (
          SELECT 1
          FROM public.client_category cc
          JOIN public.category_business cb ON cb.id = cc.category_id
          WHERE cc.client_id = o.client_id
            AND cb.label = 'ESF'
        ) AS is_esf
      FROM public.opportunity o
      LEFT JOIN public.client c ON c.id = o.client_id
      LEFT JOIN public.collaborator col ON col.id = o.collaborator_id
      LEFT JOIN public.team t ON t.id = col.team_id
      WHERE o.kanban_status <> 'perdue'
        AND o.invoice_frequency IS NOT NULL
        AND coalesce(o.price, 0) <> 0
        AND (
          (
            o.invoice_frequency = 'echellonne'
            AND EXISTS (
              SELECT 1
              FROM public.invoice_schedule s
              WHERE s.opportunity_id = o.id
            )
          )
          OR (
            o.invoice_frequency <> 'echellonne'
            AND o.end_at IS NOT NULL
            AND (
              (o.kanban_status = 'gagne' AND o.closed_at IS NOT NULL)
              OR (o.kanban_status <> 'gagne' AND o.due_date_at IS NOT NULL)
            )
          )
        )
    LOOP
      IF rec.kanban_status = 'gagne' THEN
        v_bucket := 'engage';
      ELSE
        v_bucket := 'previsionnel';
      END IF;

      IF rec.invoice_frequency = 'echellonne' THEN
        FOR sched IN
          SELECT s.invoice_at, s.amount
          FROM public.invoice_schedule s
          WHERE s.opportunity_id = rec.id
        LOOP
          v_inst := v_inst || jsonb_build_array(jsonb_build_object(
            'year', extract(year FROM sched.invoice_at)::integer,
            'month', extract(month FROM sched.invoice_at)::integer,
            'amount', sched.amount,
            'bucket', v_bucket,
            'client_id', rec.client_id::text,
            'client_label', coalesce(rec.client_name, 'Sans client'),
            'team_label', rec.team_label,
            'is_esf', rec.is_esf
          ));
        END LOOP;
        CONTINUE;
      END IF;

      IF rec.kanban_status = 'gagne' THEN
        v_start := rec.closed_at;
      ELSE
        v_start := rec.due_date_at;
      END IF;

      v_months := ARRAY[]::integer[];
      IF rec.invoice_frequency = 'unique' THEN
        v_months := ARRAY[
          extract(year FROM rec.end_at)::integer * 100
          + extract(month FROM rec.end_at)::integer
        ];
      ELSIF rec.invoice_frequency = 'mensuel' THEN
        v_idx := extract(year FROM v_start)::integer * 12
          + (extract(month FROM v_start)::integer - 1);
        v_end_idx := extract(year FROM rec.end_at)::integer * 12
          + (extract(month FROM rec.end_at)::integer - 1);
        WHILE v_idx <= v_end_idx LOOP
          v_cy := v_idx / 12;
          v_cm := (v_idx % 12) + 1;
          v_months := array_append(v_months, v_cy * 100 + v_cm);
          v_idx := v_idx + 1;
        END LOOP;
      ELSE
        v_step := CASE
          WHEN rec.invoice_frequency = 'trimestriel' THEN 3
          ELSE 12
        END;
        v_idx := extract(year FROM v_start)::integer * 12
          + (extract(month FROM v_start)::integer - 1)
          + 1;
        LOOP
          v_cy := v_idx / 12;
          v_cm := (v_idx % 12) + 1;
          v_last := (make_date(v_cy, v_cm, 1) + interval '1 month' - interval '1 day')::date;
          EXIT WHEN v_last > rec.end_at;
          v_months := array_append(v_months, v_cy * 100 + v_cm);
          v_idx := v_idx + v_step;
        END LOOP;
      END IF;

      IF coalesce(cardinality(v_months), 0) = 0 THEN
        CONTINUE;
      END IF;

      v_amount := round(rec.price / cardinality(v_months), 2);
      FOREACH v_encoded IN ARRAY v_months LOOP
        v_inst := v_inst || jsonb_build_array(jsonb_build_object(
          'year', v_encoded / 100,
          'month', v_encoded % 100,
          'amount', v_amount,
          'bucket', v_bucket,
          'client_id', rec.client_id::text,
          'client_label', coalesce(rec.client_name, 'Sans client'),
          'team_label', rec.team_label,
          'is_esf', rec.is_esf
        ));
      END LOOP;
    END LOOP;

    -- KPI engagé : somme des échéances gagnées de l'année Paris courante
    SELECT coalesce(round(sum(i.amount), 2), 0)
    INTO v_sum_price
    FROM jsonb_to_recordset(v_inst) AS i(
      year integer,
      month integer,
      amount numeric,
      bucket text,
      client_id text,
      client_label text,
      team_label text,
      is_esf boolean
    )
    WHERE i.year = v_paris_year
      AND i.bucket = 'engage';

    -- KPI pondéré / prévisionnel : opportunités ouvertes (hors gagne/perdue)
    FOR rec IN
      SELECT
        o.id,
        o.price,
        o.average_price,
        o.probability_confirmation,
        o.kanban_status,
        o.due_date_at,
        o.end_at,
        o.invoice_frequency
      FROM public.opportunity o
      WHERE o.kanban_status NOT IN ('gagne', 'perdue')
    LOOP
      v_prob := coalesce(rec.probability_confirmation, 0) / 100.0;

      IF rec.invoice_frequency IS NULL
         OR coalesce(rec.price, 0) = 0
         OR (
           rec.invoice_frequency = 'echellonne'
           AND NOT EXISTS (
             SELECT 1
             FROM public.invoice_schedule s
             WHERE s.opportunity_id = rec.id
           )
         )
         OR (
           rec.invoice_frequency <> 'echellonne'
           AND (
             rec.end_at IS NULL
             OR rec.due_date_at IS NULL
           )
         )
      THEN
        IF rec.due_date_at IS NOT NULL
           AND extract(year FROM rec.due_date_at)::integer = v_paris_year
        THEN
          v_sum_avg := v_sum_avg + coalesce(rec.average_price, 0);
          v_sum_prev := v_sum_prev + coalesce(rec.price, 0);
        END IF;
        CONTINUE;
      END IF;

      IF rec.invoice_frequency = 'echellonne' THEN
        FOR sched IN
          SELECT s.invoice_at, s.amount
          FROM public.invoice_schedule s
          WHERE s.opportunity_id = rec.id
        LOOP
          IF extract(year FROM sched.invoice_at)::integer = v_paris_year THEN
            v_sum_avg := v_sum_avg + round(sched.amount * v_prob, 2);
            v_sum_prev := v_sum_prev + sched.amount;
          END IF;
        END LOOP;
        CONTINUE;
      END IF;

      v_start := rec.due_date_at;
      v_months := ARRAY[]::integer[];
      IF rec.invoice_frequency = 'unique' THEN
        v_months := ARRAY[
          extract(year FROM rec.end_at)::integer * 100
          + extract(month FROM rec.end_at)::integer
        ];
      ELSIF rec.invoice_frequency = 'mensuel' THEN
        v_idx := extract(year FROM v_start)::integer * 12
          + (extract(month FROM v_start)::integer - 1);
        v_end_idx := extract(year FROM rec.end_at)::integer * 12
          + (extract(month FROM rec.end_at)::integer - 1);
        WHILE v_idx <= v_end_idx LOOP
          v_cy := v_idx / 12;
          v_cm := (v_idx % 12) + 1;
          v_months := array_append(v_months, v_cy * 100 + v_cm);
          v_idx := v_idx + 1;
        END LOOP;
      ELSE
        v_step := CASE
          WHEN rec.invoice_frequency = 'trimestriel' THEN 3
          ELSE 12
        END;
        v_idx := extract(year FROM v_start)::integer * 12
          + (extract(month FROM v_start)::integer - 1)
          + 1;
        LOOP
          v_cy := v_idx / 12;
          v_cm := (v_idx % 12) + 1;
          v_last := (make_date(v_cy, v_cm, 1) + interval '1 month' - interval '1 day')::date;
          EXIT WHEN v_last > rec.end_at;
          v_months := array_append(v_months, v_cy * 100 + v_cm);
          v_idx := v_idx + v_step;
        END LOOP;
      END IF;

      IF coalesce(cardinality(v_months), 0) = 0 THEN
        CONTINUE;
      END IF;

      v_amount := round(rec.price / cardinality(v_months), 2);
      FOREACH v_encoded IN ARRAY v_months LOOP
        IF v_encoded / 100 = v_paris_year THEN
          v_sum_avg := v_sum_avg + round(v_amount * v_prob, 2);
          v_sum_prev := v_sum_prev + v_amount;
        END IF;
      END LOOP;
    END LOOP;

    v_kpis := jsonb_build_object(
      'count', coalesce(v_count, 0),
      'sumPrice', coalesce(v_sum_price, 0),
      'sumAveragePrice', coalesce(round(v_sum_avg, 2), 0),
      'sumPrevisionnel', coalesce(round(v_sum_prev, 2), 0),
      'missingEngageBillingCount', coalesce(v_missing_engage, 0),
      'conversionRate', CASE
        WHEN coalesce(v_count, 0) = 0 THEN 0
        ELSE v_won::numeric / v_count
      END
    );

    SELECT coalesce(jsonb_agg(
      jsonb_build_object('id', id, 'year', year, 'amount', amount)
      ORDER BY year DESC
    ), '[]'::jsonb)
    INTO v_aims
    FROM public.revenue_aim;

    SELECT coalesce(jsonb_object_agg(year::text, amount), '{}'::jsonb)
    INTO v_aims_by_year
    FROM public.revenue_aim;

    SELECT coalesce(array_agg(DISTINCT y ORDER BY y DESC), ARRAY[v_paris_year])
    INTO v_years
    FROM (
      SELECT v_paris_year AS y
      UNION
      SELECT year FROM public.revenue_aim
      UNION
      SELECT year FROM jsonb_to_recordset(v_inst) AS analyses_inst(
      year integer,
      month integer,
      amount numeric,
      bucket text,
      client_id text,
      client_label text,
      team_label text,
      is_esf boolean
    )
    ) s;

    FOREACH v_y IN ARRAY v_years LOOP
      SELECT coalesce(jsonb_agg(x.obj ORDER BY x.month), '[]'::jsonb)
      INTO v_points
      FROM (
        SELECT
          gs.m AS month,
          jsonb_build_object(
            'month', gs.m,
            'label', v_labels[gs.m],
            'engage', coalesce((
              SELECT round(sum(i.amount), 2)
              FROM jsonb_to_recordset(v_inst) AS i(
              year integer,
              month integer,
              amount numeric,
              bucket text,
              client_id text,
              client_label text,
              team_label text,
              is_esf boolean
            )
              WHERE i.year = v_y AND i.month = gs.m AND i.bucket = 'engage'
            ), 0),
            'previsionnel', coalesce((
              SELECT round(sum(i.amount), 2)
              FROM jsonb_to_recordset(v_inst) AS i(
              year integer,
              month integer,
              amount numeric,
              bucket text,
              client_id text,
              client_label text,
              team_label text,
              is_esf boolean
            )
              WHERE i.year = v_y AND i.month = gs.m AND i.bucket = 'previsionnel'
            ), 0)
          ) AS obj
        FROM generate_series(1, 12) AS gs(m)
      ) x;
      v_pipeline := v_pipeline || jsonb_build_object(v_y::text, v_points);

      SELECT coalesce(jsonb_agg(
        jsonb_build_object(
          'key', label,
          'label', label,
          'engage', engage,
          'previsionnel', previsionnel
        ) ORDER BY (engage + previsionnel) DESC, label
      ), '[]'::jsonb)
      INTO v_tmp
      FROM (
        SELECT
          team_label AS label,
          coalesce(round(sum(amount) FILTER (WHERE bucket = 'engage'), 2), 0) AS engage,
          coalesce(round(sum(amount) FILTER (WHERE bucket = 'previsionnel'), 2), 0) AS previsionnel
        FROM jsonb_to_recordset(v_inst) AS analyses_inst(
      year integer,
      month integer,
      amount numeric,
      bucket text,
      client_id text,
      client_label text,
      team_label text,
      is_esf boolean
    )
        WHERE year = v_y
        GROUP BY team_label
      ) teams;
      v_teams := v_teams || jsonb_build_object(v_y::text, v_tmp);

      SELECT coalesce(jsonb_object_agg(
        ids.client_id,
        jsonb_build_object(
          'clientId', ids.client_id,
          'total', (
            SELECT coalesce(round(sum(i.amount), 2), 0)
            FROM jsonb_to_recordset(v_inst) AS i(
              year integer,
              month integer,
              amount numeric,
              bucket text,
              client_id text,
              client_label text,
              team_label text,
              is_esf boolean
            )
            WHERE i.year = v_y
              AND (
                (ids.is_esf_entity AND i.is_esf)
                OR (NOT ids.is_esf_entity AND i.client_id = ids.client_id)
              )
          ),
          'months', (
            SELECT coalesce(jsonb_agg(
              jsonb_build_object(
                'month', gs.m,
                'label', v_labels[gs.m],
                'engage', coalesce((
                  SELECT round(sum(i.amount), 2)
                  FROM jsonb_to_recordset(v_inst) AS i(
              year integer,
              month integer,
              amount numeric,
              bucket text,
              client_id text,
              client_label text,
              team_label text,
              is_esf boolean
            )
                  WHERE i.year = v_y
                    AND i.month = gs.m
                    AND i.bucket = 'engage'
                    AND (
                      (ids.is_esf_entity AND i.is_esf)
                      OR (NOT ids.is_esf_entity AND i.client_id = ids.client_id)
                    )
                ), 0),
                'previsionnel', coalesce((
                  SELECT round(sum(i.amount), 2)
                  FROM jsonb_to_recordset(v_inst) AS i(
              year integer,
              month integer,
              amount numeric,
              bucket text,
              client_id text,
              client_label text,
              team_label text,
              is_esf boolean
            )
                  WHERE i.year = v_y
                    AND i.month = gs.m
                    AND i.bucket = 'previsionnel'
                    AND (
                      (ids.is_esf_entity AND i.is_esf)
                      OR (NOT ids.is_esf_entity AND i.client_id = ids.client_id)
                    )
                ), 0)
              ) ORDER BY gs.m
            ), '[]'::jsonb)
            FROM generate_series(1, 12) AS gs(m)
          )
        )
      ), '{}'::jsonb)
      INTO v_client_year
      FROM (
        SELECT DISTINCT client_id, false AS is_esf_entity
        FROM jsonb_to_recordset(v_inst) AS analyses_inst(
      year integer,
      month integer,
      amount numeric,
      bucket text,
      client_id text,
      client_label text,
      team_label text,
      is_esf boolean
    )
        WHERE year = v_y
        UNION ALL
        SELECT 'entity:ESF', true
        WHERE EXISTS (
          SELECT 1 FROM jsonb_to_recordset(v_inst) AS analyses_inst(
      year integer,
      month integer,
      amount numeric,
      bucket text,
      client_id text,
      client_label text,
      team_label text,
      is_esf boolean
    ) WHERE year = v_y AND is_esf
        )
      ) ids;
      v_by_client := v_by_client || jsonb_build_object(v_y::text, v_client_year);
    END LOOP;

    SELECT coalesce(jsonb_agg(
      jsonb_build_object('id', client_id, 'label', client_label)
      ORDER BY (client_id = 'entity:ESF') DESC, client_label
    ), '[]'::jsonb)
    INTO v_options
    FROM (
      SELECT DISTINCT client_id, client_label
      FROM jsonb_to_recordset(v_inst) AS analyses_inst(
      year integer,
      month integer,
      amount numeric,
      bucket text,
      client_id text,
      client_label text,
      team_label text,
      is_esf boolean
    )
      UNION
      SELECT 'entity:ESF', 'ESF'
      WHERE EXISTS (SELECT 1 FROM jsonb_to_recordset(v_inst) AS analyses_inst(
      year integer,
      month integer,
      amount numeric,
      bucket text,
      client_id text,
      client_label text,
      team_label text,
      is_esf boolean
    ) WHERE is_esf)
    ) opts;

    v_opp := jsonb_build_object(
      'kpis', v_kpis,
      'byStatus', v_by_status,
      'availableYears', to_jsonb(v_years),
      'defaultYear', v_paris_year,
      'pipelineByYear', v_pipeline,
      'caClientOptions', v_options,
      'caByClientByYear', v_by_client,
      'caByTeamByYear', v_teams,
      'missingBillingCount', coalesce(v_missing, 0),
      'revenueAims', v_aims,
      'revenueAimsByYear', v_aims_by_year
    );
  END IF;

  IF coalesce(p_missions, true) THEN
    SELECT jsonb_build_object(
      'count', count(*),
      'inProduction', count(*) FILTER (WHERE kanban_status = 'en_cours'),
      'abandoned', count(*) FILTER (
        WHERE kanban_status = 'archivee' AND completed_at IS NULL
      ),
      'completed', count(*) FILTER (WHERE completed_at IS NOT NULL)
    )
    INTO v_mission_kpis
    FROM public.mission;

    SELECT coalesce(jsonb_agg(
      jsonb_build_object(
        'key', s.status,
        'label', s.label,
        'value', coalesce(c.cnt, 0)
      ) ORDER BY s.ord
    ), '[]'::jsonb)
    INTO v_mission_status
    FROM (
      VALUES
        (1, 'a_faire', 'À faire'),
        (2, 'en_cours', 'En cours'),
        (3, 'terminee', 'Terminé')
    ) AS s(ord, status, label)
    LEFT JOIN (
      SELECT m.kanban_status::text AS status, count(*)::bigint AS cnt
      FROM public.mission m
      WHERE m.kanban_status IN ('a_faire', 'en_cours', 'terminee')
        AND m.end_at IS NOT NULL
        AND extract(year FROM m.end_at)::integer = v_paris_year
        AND extract(month FROM m.end_at)::integer = v_paris_month
      GROUP BY m.kanban_status
    ) c ON c.status = s.status;

    SELECT coalesce(jsonb_agg(
      jsonb_build_object('key', label, 'label', label, 'value', cnt)
      ORDER BY cnt DESC, label
    ), '[]'::jsonb)
    INTO v_mission_team
    FROM (
      SELECT coalesce(t.team_name, 'Sans pôle') AS label, count(*)::bigint AS cnt
      FROM public.mission m
      LEFT JOIN public.collaborator col ON col.id = m.collaborator_id
      LEFT JOIN public.team t ON t.id = col.team_id
      GROUP BY 1
    ) teams;

    SELECT coalesce(array_agg(DISTINCT yr ORDER BY yr DESC), ARRAY[v_paris_year])
    INTO v_mission_years
    FROM (
      SELECT v_paris_year AS yr
      UNION
      SELECT extract(year FROM start_at)::integer
      FROM public.mission
      WHERE start_at IS NOT NULL
    ) years;

    SELECT coalesce(jsonb_object_agg(y.yr::text, y.points), '{}'::jsonb)
    INTO v_mission_pipeline
    FROM (
      SELECT
        yr,
        (
          SELECT coalesce(jsonb_agg(
            jsonb_build_object(
              'key', gs.m::text,
              'label', v_labels[gs.m],
              'value', (
                SELECT count(*)::bigint
                FROM public.mission mi
                WHERE mi.start_at IS NOT NULL
                  AND extract(year FROM mi.start_at)::integer = yr
                  AND extract(month FROM mi.start_at)::integer = gs.m
              )
            ) ORDER BY gs.m
          ), '[]'::jsonb)
          FROM generate_series(1, 12) AS gs(m)
        ) AS points
      FROM unnest(v_mission_years) AS yr
    ) y;

    v_mis := jsonb_build_object(
      'kpis', v_mission_kpis,
      'byStatus', v_mission_status,
      'byTeam', v_mission_team,
      'availableYears', to_jsonb(v_mission_years),
      'defaultYear', CASE
        WHEN v_paris_year = ANY (v_mission_years) THEN v_paris_year
        ELSE v_mission_years[1]
      END,
      'pipelineByYear', v_mission_pipeline
    );
  END IF;

  IF coalesce(p_subscriptions, true) THEN
    v_cur_rows := '[]'::jsonb;
    v_tool_rows := '[]'::jsonb;
    v_cat_rows := '[]'::jsonb;

    FOR rec IN
      SELECT
        t.id AS tool_id,
        t.tool_name,
        s.subscription_plan::text AS plan,
        p.currency,
        p.amount,
        p.valid_from,
        p.valid_to,
        coalesce(
          (
            SELECT jsonb_agg(jsonb_build_object('id', c.id, 'label', c.label))
            FROM public.tool_category tc
            JOIN public.category c ON c.id = tc.category_id
            WHERE tc.tool_id = t.id
          ),
          '[]'::jsonb
        ) AS categories
      FROM public.tool t
      JOIN public.tool_subscription s ON s.tool_id = t.id
      JOIN public.tool_subscription_price p ON p.tool_subscription_id = s.id
    LOOP
      v_monthly := CASE
        WHEN rec.plan = 'mensuel' THEN rec.amount
        ELSE round(rec.amount / 12.0)
      END;
      v_n := jsonb_array_length(rec.categories);
      FOR v_y IN 2025..v_paris_year LOOP
        v_max_month := CASE WHEN v_y = v_paris_year THEN v_paris_month ELSE 12 END;
        FOR v_m IN 1..v_max_month LOOP
          v_month_start := make_date(v_y, v_m, 1);
          v_month_end := (v_month_start + interval '1 month' - interval '1 day')::date;
          IF rec.valid_from > v_month_end THEN
            CONTINUE;
          END IF;
          IF rec.valid_to IS NOT NULL AND rec.valid_to < v_month_start THEN
            CONTINUE;
          END IF;
          v_ym := to_char(v_month_start, 'YYYY-MM');
          v_cur_rows := v_cur_rows || jsonb_build_array(jsonb_build_object(
            'ym', v_ym,
            'currency', upper(rec.currency),
            'cents', v_monthly
          ));
          v_tool_rows := v_tool_rows || jsonb_build_array(jsonb_build_object(
            'ym', v_ym,
            'item_id', rec.tool_id::text,
            'label', rec.tool_name,
            'cents', v_monthly
          ));
          IF v_n = 0 THEN
            v_cat_rows := v_cat_rows || jsonb_build_array(jsonb_build_object(
              'ym', v_ym,
              'item_id', '__none__',
              'label', 'Sans catégorie',
              'cents', v_monthly
            ));
          ELSE
            v_share := v_monthly / v_n;
            FOR v_cat IN
              SELECT jsonb_array_elements(rec.categories)
            LOOP
              v_cat_rows := v_cat_rows || jsonb_build_array(jsonb_build_object(
                'ym', v_ym,
                'item_id', v_cat ->> 'id',
                'label', v_cat ->> 'label',
                'cents', v_share
              ));
            END LOOP;
          END IF;
        END LOOP;
      END LOOP;
    END LOOP;

    SELECT coalesce(array_agg(y ORDER BY y), ARRAY[]::integer[])
    INTO v_sub_years
    FROM generate_series(2025, v_paris_year) AS y;

    FOR v_y IN 2025..v_paris_year LOOP
      FOR v_m IN 1..12 LOOP
        v_ym := to_char(make_date(v_y, v_m, 1), 'YYYY-MM');

        SELECT coalesce(jsonb_agg(
          jsonb_build_object('currency', currency, 'amountCents', cents)
          ORDER BY currency
        ), '[]'::jsonb)
        INTO v_tmp
        FROM (
          SELECT currency, sum(cents) AS cents
          FROM jsonb_to_recordset(v_cur_rows) AS sub_currency(
            ym text,
            currency text,
            cents numeric
          )
          WHERE ym = v_ym
          GROUP BY currency
        ) cur;
        v_currency := v_currency || jsonb_build_object(v_ym, v_tmp);

        SELECT coalesce(jsonb_agg(
          jsonb_build_object(
            'key', item_id,
            'label', label,
            'value', round(cents)
          ) ORDER BY cents DESC, label
        ), '[]'::jsonb)
        INTO v_tmp
        FROM (
          SELECT item_id, max(label) AS label, sum(cents) AS cents
          FROM jsonb_to_recordset(v_tool_rows) AS sub_tool(
            ym text,
            item_id text,
            label text,
            cents numeric
          )
          WHERE ym = v_ym
          GROUP BY item_id
        ) tools;
        v_by_tool := v_by_tool || jsonb_build_object(v_ym, v_tmp);

        SELECT coalesce(jsonb_agg(
          jsonb_build_object(
            'key', item_id,
            'label', label,
            'value', round(cents)
          ) ORDER BY cents DESC, label
        ), '[]'::jsonb)
        INTO v_tmp
        FROM (
          SELECT item_id, max(label) AS label, sum(cents) AS cents
          FROM jsonb_to_recordset(v_cat_rows) AS sub_cat(
            ym text,
            item_id text,
            label text,
            cents numeric
          )
          WHERE ym = v_ym
          GROUP BY item_id
        ) cats;
        v_by_cat := v_by_cat || jsonb_build_object(v_ym, v_tmp);
      END LOOP;
    END LOOP;

    SELECT coalesce(jsonb_agg(
      jsonb_build_object(
        'month', gs.m,
        'label', v_labels[gs.m],
        'values', (
          SELECT coalesce(jsonb_object_agg(
            yr::text,
            CASE
              WHEN yr = v_paris_year AND gs.m > v_paris_month THEN 0
              ELSE coalesce((
                SELECT sum(cents)
                FROM jsonb_to_recordset(v_cur_rows) AS sub_currency(
            ym text,
            currency text,
            cents numeric
          )
                WHERE ym = to_char(make_date(yr, gs.m, 1), 'YYYY-MM')
              ), 0)
            END
          ), '{}'::jsonb)
          FROM generate_series(2025, v_paris_year) AS yr
        )
      ) ORDER BY gs.m
    ), '[]'::jsonb)
    INTO v_evo
    FROM generate_series(1, 12) AS gs(m);

    v_sub := jsonb_build_object(
      'currentYear', v_paris_year,
      'currentMonth', v_paris_month,
      'startYear', 2025,
      'years', to_jsonb(v_sub_years),
      'monthlyByCurrencyByMonth', v_currency,
      'costByToolByMonth', v_by_tool,
      'costByCategoryByMonth', v_by_cat,
      'costEvolution', jsonb_build_object(
        'years', to_jsonb(v_sub_years),
        'points', v_evo
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'opportunities', v_opp,
    'missions', v_mis,
    'subscriptions', v_sub
  );
END;
$$;

REVOKE ALL ON FUNCTION public.load_analyses_payload(boolean, boolean, boolean)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.load_analyses_payload(boolean, boolean, boolean)
  TO authenticated;
