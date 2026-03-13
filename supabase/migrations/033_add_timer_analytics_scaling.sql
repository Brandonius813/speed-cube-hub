-- Migration 033: Add timer analytics summaries and rollups for large solve histories

CREATE OR REPLACE FUNCTION public.timer_effective_ms(
  p_time_ms integer,
  p_penalty text
)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_penalty = 'DNF' THEN NULL
    WHEN p_penalty = '+2' THEN p_time_ms + 2000
    ELSE p_time_ms
  END
$$;

CREATE OR REPLACE FUNCTION public.timer_local_date(p_solved_at timestamptz)
RETURNS date
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT timezone('America/Los_Angeles', p_solved_at)::date
$$;

CREATE TABLE IF NOT EXISTS public.solve_session_summaries (
  solve_session_id uuid PRIMARY KEY REFERENCES public.solve_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event text NOT NULL,
  solve_count integer NOT NULL DEFAULT 0,
  dnf_count integer NOT NULL DEFAULT 0,
  valid_solve_count integer NOT NULL DEFAULT 0,
  total_effective_time_ms bigint NOT NULL DEFAULT 0,
  best_single_ms integer,
  mean_ms integer,
  first_solved_at timestamptz,
  last_solved_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.event_summaries (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event text NOT NULL,
  solve_count integer NOT NULL DEFAULT 0,
  dnf_count integer NOT NULL DEFAULT 0,
  valid_solve_count integer NOT NULL DEFAULT 0,
  total_effective_time_ms bigint NOT NULL DEFAULT 0,
  best_single_ms integer,
  mean_ms integer,
  first_solved_at timestamptz,
  last_solved_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, event)
);

CREATE TABLE IF NOT EXISTS public.solve_daily_rollups (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event text NOT NULL,
  local_date date NOT NULL,
  solve_count integer NOT NULL DEFAULT 0,
  dnf_count integer NOT NULL DEFAULT 0,
  valid_solve_count integer NOT NULL DEFAULT 0,
  total_effective_time_ms bigint NOT NULL DEFAULT 0,
  best_single_ms integer,
  mean_ms integer,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, event, local_date)
);

CREATE INDEX IF NOT EXISTS idx_solves_user_solve_session_recent
  ON public.solves (user_id, solve_session_id, solved_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_solves_user_event_recent_id
  ON public.solves (user_id, event, solved_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_solve_daily_rollups_user_event_date
  ON public.solve_daily_rollups (user_id, event, local_date DESC);

ALTER TABLE public.solve_session_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solve_daily_rollups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own solve session summaries" ON public.solve_session_summaries;
CREATE POLICY "Users can read own solve session summaries"
  ON public.solve_session_summaries FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own event summaries" ON public.event_summaries;
CREATE POLICY "Users can read own event summaries"
  ON public.event_summaries FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own solve daily rollups" ON public.solve_daily_rollups;
CREATE POLICY "Users can read own solve daily rollups"
  ON public.solve_daily_rollups FOR SELECT
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.refresh_solve_session_summary(
  p_user_id uuid,
  p_solve_session_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  DELETE FROM public.solve_session_summaries
  WHERE solve_session_id = p_solve_session_id
    AND user_id = p_user_id;

  INSERT INTO public.solve_session_summaries (
    solve_session_id,
    user_id,
    event,
    solve_count,
    dnf_count,
    valid_solve_count,
    total_effective_time_ms,
    best_single_ms,
    mean_ms,
    first_solved_at,
    last_solved_at,
    updated_at
  )
  SELECT
    s.solve_session_id,
    s.user_id,
    s.event,
    COUNT(*)::integer AS solve_count,
    COUNT(*) FILTER (WHERE s.penalty = 'DNF')::integer AS dnf_count,
    COUNT(*) FILTER (WHERE public.timer_effective_ms(s.time_ms, s.penalty) IS NOT NULL)::integer AS valid_solve_count,
    COALESCE(SUM(public.timer_effective_ms(s.time_ms, s.penalty)), 0)::bigint AS total_effective_time_ms,
    MIN(public.timer_effective_ms(s.time_ms, s.penalty)) AS best_single_ms,
    CASE
      WHEN COUNT(*) FILTER (WHERE public.timer_effective_ms(s.time_ms, s.penalty) IS NOT NULL) = 0 THEN NULL
      ELSE ROUND(AVG(public.timer_effective_ms(s.time_ms, s.penalty)))::integer
    END AS mean_ms,
    MIN(s.solved_at) AS first_solved_at,
    MAX(s.solved_at) AS last_solved_at,
    now() AS updated_at
  FROM public.solves s
  WHERE s.user_id = p_user_id
    AND s.solve_session_id = p_solve_session_id
  GROUP BY s.solve_session_id, s.user_id, s.event;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_timer_event_analytics(
  p_user_id uuid,
  p_event text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  DELETE FROM public.event_summaries
  WHERE user_id = p_user_id
    AND event = p_event;

  INSERT INTO public.event_summaries (
    user_id,
    event,
    solve_count,
    dnf_count,
    valid_solve_count,
    total_effective_time_ms,
    best_single_ms,
    mean_ms,
    first_solved_at,
    last_solved_at,
    updated_at
  )
  SELECT
    s.user_id,
    s.event,
    COUNT(*)::integer AS solve_count,
    COUNT(*) FILTER (WHERE s.penalty = 'DNF')::integer AS dnf_count,
    COUNT(*) FILTER (WHERE public.timer_effective_ms(s.time_ms, s.penalty) IS NOT NULL)::integer AS valid_solve_count,
    COALESCE(SUM(public.timer_effective_ms(s.time_ms, s.penalty)), 0)::bigint AS total_effective_time_ms,
    MIN(public.timer_effective_ms(s.time_ms, s.penalty)) AS best_single_ms,
    CASE
      WHEN COUNT(*) FILTER (WHERE public.timer_effective_ms(s.time_ms, s.penalty) IS NOT NULL) = 0 THEN NULL
      ELSE ROUND(AVG(public.timer_effective_ms(s.time_ms, s.penalty)))::integer
    END AS mean_ms,
    MIN(s.solved_at) AS first_solved_at,
    MAX(s.solved_at) AS last_solved_at,
    now() AS updated_at
  FROM public.solves s
  WHERE s.user_id = p_user_id
    AND s.event = p_event
  GROUP BY s.user_id, s.event;

  DELETE FROM public.solve_daily_rollups
  WHERE user_id = p_user_id
    AND event = p_event;

  INSERT INTO public.solve_daily_rollups (
    user_id,
    event,
    local_date,
    solve_count,
    dnf_count,
    valid_solve_count,
    total_effective_time_ms,
    best_single_ms,
    mean_ms,
    updated_at
  )
  SELECT
    s.user_id,
    s.event,
    public.timer_local_date(s.solved_at) AS local_date,
    COUNT(*)::integer AS solve_count,
    COUNT(*) FILTER (WHERE s.penalty = 'DNF')::integer AS dnf_count,
    COUNT(*) FILTER (WHERE public.timer_effective_ms(s.time_ms, s.penalty) IS NOT NULL)::integer AS valid_solve_count,
    COALESCE(SUM(public.timer_effective_ms(s.time_ms, s.penalty)), 0)::bigint AS total_effective_time_ms,
    MIN(public.timer_effective_ms(s.time_ms, s.penalty)) AS best_single_ms,
    CASE
      WHEN COUNT(*) FILTER (WHERE public.timer_effective_ms(s.time_ms, s.penalty) IS NOT NULL) = 0 THEN NULL
      ELSE ROUND(AVG(public.timer_effective_ms(s.time_ms, s.penalty)))::integer
    END AS mean_ms,
    now() AS updated_at
  FROM public.solves s
  WHERE s.user_id = p_user_id
    AND s.event = p_event
  GROUP BY s.user_id, s.event, public.timer_local_date(s.solved_at);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_timer_event_distribution(
  p_user_id uuid,
  p_event text,
  p_bucket_count integer DEFAULT 16
)
RETURNS TABLE (
  bucket_index integer,
  range_start_ms integer,
  range_end_ms integer,
  solve_count bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH authorized AS (
    SELECT CASE
      WHEN auth.uid() IS NULL OR auth.uid() = p_user_id THEN 1
      ELSE 0
    END AS allowed
  ),
  base AS (
    SELECT public.timer_effective_ms(s.time_ms, s.penalty) AS effective_ms
    FROM public.solves s
    CROSS JOIN authorized a
    WHERE a.allowed = 1
      AND s.user_id = p_user_id
      AND s.event = p_event
      AND public.timer_effective_ms(s.time_ms, s.penalty) IS NOT NULL
  ),
  stats AS (
    SELECT
      MIN(effective_ms) AS min_ms,
      MAX(effective_ms) AS max_ms,
      GREATEST(COALESCE(p_bucket_count, 16), 1) AS bucket_count
    FROM base
  ),
  bucketed AS (
    SELECT
      CASE
        WHEN stats.min_ms IS NULL THEN NULL
        WHEN stats.min_ms = stats.max_ms THEN 1
        ELSE width_bucket(
          base.effective_ms::numeric,
          stats.min_ms::numeric,
          (stats.max_ms + 1)::numeric,
          stats.bucket_count
        )
      END AS bucket_index,
      stats.min_ms,
      stats.max_ms,
      stats.bucket_count
    FROM base
    CROSS JOIN stats
  )
  SELECT
    b.bucket_index,
    CASE
      WHEN b.min_ms = b.max_ms THEN b.min_ms
      ELSE FLOOR(
        b.min_ms + ((b.bucket_index - 1)::numeric * ((b.max_ms + 1 - b.min_ms)::numeric / b.bucket_count))
      )::integer
    END AS range_start_ms,
    CASE
      WHEN b.min_ms = b.max_ms THEN b.max_ms
      ELSE CEIL(
        b.min_ms + (b.bucket_index::numeric * ((b.max_ms + 1 - b.min_ms)::numeric / b.bucket_count)) - 1
      )::integer
    END AS range_end_ms,
    COUNT(*)::bigint AS solve_count
  FROM bucketed b
  WHERE b.bucket_index IS NOT NULL
  GROUP BY b.bucket_index, b.min_ms, b.max_ms, b.bucket_count
  ORDER BY b.bucket_index;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_solve_session_summary(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_timer_event_analytics(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_timer_event_distribution(uuid, text, integer) TO authenticated;

INSERT INTO public.solve_session_summaries (
  solve_session_id,
  user_id,
  event,
  solve_count,
  dnf_count,
  valid_solve_count,
  total_effective_time_ms,
  best_single_ms,
  mean_ms,
  first_solved_at,
  last_solved_at,
  updated_at
)
SELECT
  s.solve_session_id,
  s.user_id,
  s.event,
  COUNT(*)::integer AS solve_count,
  COUNT(*) FILTER (WHERE s.penalty = 'DNF')::integer AS dnf_count,
  COUNT(*) FILTER (WHERE public.timer_effective_ms(s.time_ms, s.penalty) IS NOT NULL)::integer AS valid_solve_count,
  COALESCE(SUM(public.timer_effective_ms(s.time_ms, s.penalty)), 0)::bigint AS total_effective_time_ms,
  MIN(public.timer_effective_ms(s.time_ms, s.penalty)) AS best_single_ms,
  CASE
    WHEN COUNT(*) FILTER (WHERE public.timer_effective_ms(s.time_ms, s.penalty) IS NOT NULL) = 0 THEN NULL
    ELSE ROUND(AVG(public.timer_effective_ms(s.time_ms, s.penalty)))::integer
  END AS mean_ms,
  MIN(s.solved_at) AS first_solved_at,
  MAX(s.solved_at) AS last_solved_at,
  now() AS updated_at
FROM public.solves s
WHERE s.solve_session_id IS NOT NULL
GROUP BY s.solve_session_id, s.user_id, s.event
ON CONFLICT (solve_session_id) DO UPDATE SET
  user_id = EXCLUDED.user_id,
  event = EXCLUDED.event,
  solve_count = EXCLUDED.solve_count,
  dnf_count = EXCLUDED.dnf_count,
  valid_solve_count = EXCLUDED.valid_solve_count,
  total_effective_time_ms = EXCLUDED.total_effective_time_ms,
  best_single_ms = EXCLUDED.best_single_ms,
  mean_ms = EXCLUDED.mean_ms,
  first_solved_at = EXCLUDED.first_solved_at,
  last_solved_at = EXCLUDED.last_solved_at,
  updated_at = EXCLUDED.updated_at;

INSERT INTO public.event_summaries (
  user_id,
  event,
  solve_count,
  dnf_count,
  valid_solve_count,
  total_effective_time_ms,
  best_single_ms,
  mean_ms,
  first_solved_at,
  last_solved_at,
  updated_at
)
SELECT
  s.user_id,
  s.event,
  COUNT(*)::integer AS solve_count,
  COUNT(*) FILTER (WHERE s.penalty = 'DNF')::integer AS dnf_count,
  COUNT(*) FILTER (WHERE public.timer_effective_ms(s.time_ms, s.penalty) IS NOT NULL)::integer AS valid_solve_count,
  COALESCE(SUM(public.timer_effective_ms(s.time_ms, s.penalty)), 0)::bigint AS total_effective_time_ms,
  MIN(public.timer_effective_ms(s.time_ms, s.penalty)) AS best_single_ms,
  CASE
    WHEN COUNT(*) FILTER (WHERE public.timer_effective_ms(s.time_ms, s.penalty) IS NOT NULL) = 0 THEN NULL
    ELSE ROUND(AVG(public.timer_effective_ms(s.time_ms, s.penalty)))::integer
  END AS mean_ms,
  MIN(s.solved_at) AS first_solved_at,
  MAX(s.solved_at) AS last_solved_at,
  now() AS updated_at
FROM public.solves s
GROUP BY s.user_id, s.event
ON CONFLICT (user_id, event) DO UPDATE SET
  solve_count = EXCLUDED.solve_count,
  dnf_count = EXCLUDED.dnf_count,
  valid_solve_count = EXCLUDED.valid_solve_count,
  total_effective_time_ms = EXCLUDED.total_effective_time_ms,
  best_single_ms = EXCLUDED.best_single_ms,
  mean_ms = EXCLUDED.mean_ms,
  first_solved_at = EXCLUDED.first_solved_at,
  last_solved_at = EXCLUDED.last_solved_at,
  updated_at = EXCLUDED.updated_at;

INSERT INTO public.solve_daily_rollups (
  user_id,
  event,
  local_date,
  solve_count,
  dnf_count,
  valid_solve_count,
  total_effective_time_ms,
  best_single_ms,
  mean_ms,
  updated_at
)
SELECT
  s.user_id,
  s.event,
  public.timer_local_date(s.solved_at) AS local_date,
  COUNT(*)::integer AS solve_count,
  COUNT(*) FILTER (WHERE s.penalty = 'DNF')::integer AS dnf_count,
  COUNT(*) FILTER (WHERE public.timer_effective_ms(s.time_ms, s.penalty) IS NOT NULL)::integer AS valid_solve_count,
  COALESCE(SUM(public.timer_effective_ms(s.time_ms, s.penalty)), 0)::bigint AS total_effective_time_ms,
  MIN(public.timer_effective_ms(s.time_ms, s.penalty)) AS best_single_ms,
  CASE
    WHEN COUNT(*) FILTER (WHERE public.timer_effective_ms(s.time_ms, s.penalty) IS NOT NULL) = 0 THEN NULL
    ELSE ROUND(AVG(public.timer_effective_ms(s.time_ms, s.penalty)))::integer
  END AS mean_ms,
  now() AS updated_at
FROM public.solves s
GROUP BY s.user_id, s.event, public.timer_local_date(s.solved_at)
ON CONFLICT (user_id, event, local_date) DO UPDATE SET
  solve_count = EXCLUDED.solve_count,
  dnf_count = EXCLUDED.dnf_count,
  valid_solve_count = EXCLUDED.valid_solve_count,
  total_effective_time_ms = EXCLUDED.total_effective_time_ms,
  best_single_ms = EXCLUDED.best_single_ms,
  mean_ms = EXCLUDED.mean_ms,
  updated_at = EXCLUDED.updated_at;
