ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS comp_sim_format text,
  ADD COLUMN IF NOT EXISTS comp_sim_result_seconds numeric,
  ADD COLUMN IF NOT EXISTS comp_sim_scene text,
  ADD COLUMN IF NOT EXISTS comp_sim_intensity integer,
  ADD COLUMN IF NOT EXISTS comp_sim_time_limit_seconds numeric,
  ADD COLUMN IF NOT EXISTS comp_sim_cutoff_attempt integer,
  ADD COLUMN IF NOT EXISTS comp_sim_cutoff_seconds numeric,
  ADD COLUMN IF NOT EXISTS comp_sim_ended_reason text,
  ADD COLUMN IF NOT EXISTS comp_sim_cutoff_met boolean;

WITH ranked_solves AS (
  SELECT
    s.id AS session_id,
    CASE
      WHEN sol.penalty = 'DNF' THEN NULL
      WHEN sol.penalty = '+2' THEN sol.time_ms + 2000
      ELSE sol.time_ms
    END AS effective_ms,
    ROW_NUMBER() OVER (
      PARTITION BY s.id
      ORDER BY
        CASE WHEN sol.penalty = 'DNF' THEN NULL ELSE CASE WHEN sol.penalty = '+2' THEN sol.time_ms + 2000 ELSE sol.time_ms END END ASC NULLS LAST,
        sol.solve_number ASC
    ) AS best_rank,
    ROW_NUMBER() OVER (
      PARTITION BY s.id
      ORDER BY
        CASE WHEN sol.penalty = 'DNF' THEN NULL ELSE CASE WHEN sol.penalty = '+2' THEN sol.time_ms + 2000 ELSE sol.time_ms END END DESC NULLS FIRST,
        sol.solve_number DESC
    ) AS worst_rank
  FROM sessions s
  JOIN solves sol
    ON sol.timer_session_id = s.timer_session_id
  WHERE s.practice_type = 'Comp Sim'
),
legacy_comp_sim AS (
  SELECT
    session_id,
    COUNT(*) AS solve_count,
    COUNT(*) FILTER (WHERE effective_ms IS NULL) AS dnf_count,
    ROUND(AVG(effective_ms) FILTER (WHERE best_rank > 1 AND worst_rank > 1))::integer AS ao5_ms
  FROM ranked_solves
  GROUP BY session_id
)
UPDATE sessions s
SET
  comp_sim_format = 'ao5',
  comp_sim_result_seconds = CASE
    WHEN legacy.solve_count = 5 AND legacy.dnf_count < 2 AND legacy.ao5_ms IS NOT NULL
      THEN FLOOR(legacy.ao5_ms / 10.0) / 100.0
    ELSE NULL
  END,
  comp_sim_ended_reason = 'completed'
FROM legacy_comp_sim legacy
WHERE s.id = legacy.session_id
  AND s.practice_type = 'Comp Sim'
  AND s.comp_sim_format IS NULL;
