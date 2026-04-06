-- Migration 037: Add practice_type to solves table for PB filtering
-- Only "Solves" and "Comp Sim" practice types count toward PBs.

-- Step 1: Add the column with a sensible default
ALTER TABLE public.solves
  ADD COLUMN IF NOT EXISTS practice_type text NOT NULL DEFAULT 'Solves';

-- Step 2: Index for efficient filtering by practice type
CREATE INDEX IF NOT EXISTS idx_solves_user_event_practice
  ON public.solves (user_id, event, practice_type, solved_at DESC);

-- Step 3: Backfill existing solves from the sessions table
-- sessions.timer_session_id links to solves.timer_session_id
UPDATE public.solves sol
SET practice_type = ses.practice_type
FROM public.sessions ses
WHERE sol.timer_session_id = ses.timer_session_id
  AND ses.practice_type IS NOT NULL
  AND ses.practice_type <> 'Solves';

-- Step 4: Update the event analytics RPC to only count PB-eligible solves
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

  -- event_summaries: only PB-eligible practice types (Solves, Comp Sim)
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
    AND s.practice_type IN ('Solves', 'Comp Sim')
  GROUP BY s.user_id, s.event;

  -- daily rollups: still count all solves (for activity heatmaps, general stats)
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
