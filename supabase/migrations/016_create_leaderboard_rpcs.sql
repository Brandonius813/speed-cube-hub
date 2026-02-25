-- T47: Move leaderboard aggregation from JavaScript to database
-- Creates RPC functions for each leaderboard category + rank lookup functions.
-- Previously, the app loaded the ENTIRE sessions table into Node.js memory
-- (potentially 300k+ rows) and aggregated in JavaScript. These functions
-- do all the math inside PostgreSQL and return only the top N results.
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- ============================================================
-- 1. MOST SOLVES — SUM(num_solves) per user
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_leaderboard_most_solves(
  p_friend_ids uuid[] DEFAULT NULL,
  p_offset int DEFAULT 0,
  p_limit int DEFAULT 50
)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  handle text,
  avatar_url text,
  stat_value bigint,
  total_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH aggregated AS (
    SELECT
      s.user_id,
      COALESCE(SUM(s.num_solves), 0)::bigint AS stat_value
    FROM sessions s
    WHERE (p_friend_ids IS NULL OR s.user_id = ANY(p_friend_ids))
    GROUP BY s.user_id
    HAVING COALESCE(SUM(s.num_solves), 0) > 0
  ),
  counted AS (
    SELECT COUNT(*)::bigint AS cnt FROM aggregated
  )
  SELECT
    a.user_id,
    p.display_name,
    p.handle,
    p.avatar_url,
    a.stat_value,
    c.cnt AS total_count
  FROM aggregated a
  JOIN profiles p ON p.id = a.user_id
  CROSS JOIN counted c
  ORDER BY a.stat_value DESC, a.user_id
  OFFSET p_offset
  LIMIT p_limit;
$$;

-- ============================================================
-- 2. MOST PRACTICE TIME — SUM(duration_minutes) per user
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_leaderboard_most_practice_time(
  p_friend_ids uuid[] DEFAULT NULL,
  p_offset int DEFAULT 0,
  p_limit int DEFAULT 50
)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  handle text,
  avatar_url text,
  stat_value bigint,
  total_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH aggregated AS (
    SELECT
      s.user_id,
      COALESCE(SUM(s.duration_minutes), 0)::bigint AS stat_value
    FROM sessions s
    WHERE (p_friend_ids IS NULL OR s.user_id = ANY(p_friend_ids))
    GROUP BY s.user_id
    HAVING COALESCE(SUM(s.duration_minutes), 0) > 0
  ),
  counted AS (
    SELECT COUNT(*)::bigint AS cnt FROM aggregated
  )
  SELECT
    a.user_id,
    p.display_name,
    p.handle,
    p.avatar_url,
    a.stat_value,
    c.cnt AS total_count
  FROM aggregated a
  JOIN profiles p ON p.id = a.user_id
  CROSS JOIN counted c
  ORDER BY a.stat_value DESC, a.user_id
  OFFSET p_offset
  LIMIT p_limit;
$$;

-- ============================================================
-- 3. LONGEST STREAK — consecutive days of practice per user
-- Uses the classic SQL "islands and gaps" pattern:
--   date - ROW_NUMBER() gives the same value for consecutive dates,
--   grouping them into streaks automatically.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_leaderboard_longest_streak(
  p_friend_ids uuid[] DEFAULT NULL,
  p_offset int DEFAULT 0,
  p_limit int DEFAULT 50
)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  handle text,
  avatar_url text,
  stat_value bigint,
  total_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH unique_dates AS (
    SELECT DISTINCT s.user_id, s.session_date
    FROM sessions s
    WHERE (p_friend_ids IS NULL OR s.user_id = ANY(p_friend_ids))
  ),
  date_groups AS (
    SELECT
      user_id,
      session_date,
      session_date - (ROW_NUMBER() OVER (
        PARTITION BY user_id ORDER BY session_date
      ))::int AS grp
    FROM unique_dates
  ),
  streaks AS (
    SELECT
      user_id,
      COUNT(*)::bigint AS streak_length
    FROM date_groups
    GROUP BY user_id, grp
  ),
  max_streaks AS (
    SELECT
      user_id,
      MAX(streak_length)::bigint AS stat_value
    FROM streaks
    GROUP BY user_id
  ),
  counted AS (
    SELECT COUNT(*)::bigint AS cnt FROM max_streaks
  )
  SELECT
    ms.user_id,
    p.display_name,
    p.handle,
    p.avatar_url,
    ms.stat_value,
    c.cnt AS total_count
  FROM max_streaks ms
  JOIN profiles p ON p.id = ms.user_id
  CROSS JOIN counted c
  ORDER BY ms.stat_value DESC, ms.user_id
  OFFSET p_offset
  LIMIT p_limit;
$$;

-- ============================================================
-- 4. "FIND ME" RANK FUNCTIONS — return a user's rank number
-- Used by the "Find Me" button to jump to the user's position.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_user_rank_most_solves(
  p_user_id uuid,
  p_friend_ids uuid[] DEFAULT NULL
)
RETURNS int
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH aggregated AS (
    SELECT
      s.user_id,
      COALESCE(SUM(s.num_solves), 0)::bigint AS stat_value
    FROM sessions s
    WHERE (p_friend_ids IS NULL OR s.user_id = ANY(p_friend_ids))
    GROUP BY s.user_id
    HAVING COALESCE(SUM(s.num_solves), 0) > 0
  ),
  ranked AS (
    SELECT user_id, ROW_NUMBER() OVER (ORDER BY stat_value DESC, user_id) AS rank
    FROM aggregated
  )
  SELECT rank::int FROM ranked WHERE user_id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION public.get_user_rank_most_practice_time(
  p_user_id uuid,
  p_friend_ids uuid[] DEFAULT NULL
)
RETURNS int
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH aggregated AS (
    SELECT
      s.user_id,
      COALESCE(SUM(s.duration_minutes), 0)::bigint AS stat_value
    FROM sessions s
    WHERE (p_friend_ids IS NULL OR s.user_id = ANY(p_friend_ids))
    GROUP BY s.user_id
    HAVING COALESCE(SUM(s.duration_minutes), 0) > 0
  ),
  ranked AS (
    SELECT user_id, ROW_NUMBER() OVER (ORDER BY stat_value DESC, user_id) AS rank
    FROM aggregated
  )
  SELECT rank::int FROM ranked WHERE user_id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION public.get_user_rank_longest_streak(
  p_user_id uuid,
  p_friend_ids uuid[] DEFAULT NULL
)
RETURNS int
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH unique_dates AS (
    SELECT DISTINCT s.user_id, s.session_date
    FROM sessions s
    WHERE (p_friend_ids IS NULL OR s.user_id = ANY(p_friend_ids))
  ),
  date_groups AS (
    SELECT
      user_id,
      session_date,
      session_date - (ROW_NUMBER() OVER (
        PARTITION BY user_id ORDER BY session_date
      ))::int AS grp
    FROM unique_dates
  ),
  streaks AS (
    SELECT
      user_id,
      COUNT(*)::bigint AS streak_length
    FROM date_groups
    GROUP BY user_id, grp
  ),
  max_streaks AS (
    SELECT
      user_id,
      MAX(streak_length)::bigint AS stat_value
    FROM streaks
    GROUP BY user_id
  ),
  ranked AS (
    SELECT user_id, ROW_NUMBER() OVER (ORDER BY stat_value DESC, user_id) AS rank
    FROM max_streaks
  )
  SELECT rank::int FROM ranked WHERE user_id = p_user_id;
$$;

-- ============================================================
-- 5. PERMISSIONS — allow both anonymous and authenticated users
-- (leaderboards page is public)
-- ============================================================

GRANT EXECUTE ON FUNCTION public.get_leaderboard_most_solves TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaderboard_most_practice_time TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaderboard_longest_streak TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_rank_most_solves TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_rank_most_practice_time TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_rank_longest_streak TO anon, authenticated;
