-- Migration 032: Add Competition Simulator progress to onboarding

ALTER TABLE public.user_onboarding
ADD COLUMN IF NOT EXISTS comp_sim_tried_at timestamptz;

UPDATE public.user_onboarding AS onboarding
SET first_timer_solve_at = COALESCE(onboarding.first_timer_solve_at, first_comp_sim.first_comp_sim_at),
    comp_sim_tried_at = COALESCE(onboarding.comp_sim_tried_at, first_comp_sim.first_comp_sim_at)
FROM (
  SELECT user_id, MIN(created_at) AS first_comp_sim_at
  FROM public.sessions
  WHERE practice_type = 'Comp Sim'
  GROUP BY user_id
) AS first_comp_sim
WHERE onboarding.user_id = first_comp_sim.user_id
  AND (
    onboarding.first_timer_solve_at IS NULL
    OR onboarding.comp_sim_tried_at IS NULL
  );

UPDATE public.user_onboarding
SET finished_at = now()
WHERE finished_at IS NULL
  AND profile_viewed_at IS NOT NULL
  AND main_cube_added_at IS NOT NULL
  AND bulk_imported_at IS NOT NULL
  AND first_timer_solve_at IS NOT NULL
  AND comp_sim_tried_at IS NOT NULL
  AND feed_visited_at IS NOT NULL
  AND clubs_searched_at IS NOT NULL;
