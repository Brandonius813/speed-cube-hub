-- Migration 024: Badge system v2 hardening + definitions refresh
-- Adds workflow columns for claim review, tightens RLS, and seeds v2 badge catalog.

-- 1) Extend user_badges with review workflow metadata
ALTER TABLE public.user_badges
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved'
    CHECK (status IN ('approved', 'pending', 'rejected')),
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'auto'
    CHECK (source IN ('auto', 'claim', 'admin')),
  ADD COLUMN IF NOT EXISTS evidence_url text,
  ADD COLUMN IF NOT EXISTS review_note text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Backfill status/source for legacy rows from verified + badge verification mode.
UPDATE public.user_badges
SET status = CASE WHEN verified THEN 'approved' ELSE 'pending' END;

UPDATE public.user_badges ub
SET source = CASE
  WHEN b.verification = 'auto' THEN 'auto'
  WHEN b.verification = 'admin' THEN 'claim'
  ELSE 'claim'
END
FROM public.badges b
WHERE ub.badge_id = b.id;

-- 2) Tighten RLS: keep public read, remove direct client writes.
DROP POLICY IF EXISTS "user_badges_insert_own" ON public.user_badges;
DROP POLICY IF EXISTS "user_badges_update_own" ON public.user_badges;
DROP POLICY IF EXISTS "user_badges_delete_own" ON public.user_badges;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'badges'
      AND policyname = 'badges_select_all'
  ) THEN
    CREATE POLICY "badges_select_all" ON public.badges
      FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_badges'
      AND policyname = 'user_badges_select_all'
  ) THEN
    CREATE POLICY "user_badges_select_all" ON public.user_badges
      FOR SELECT USING (true);
  END IF;
END
$$;

-- 3) Deduplicate legacy auto rows before enforcing idempotency index.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, badge_id, source
      ORDER BY earned_at ASC, id ASC
    ) AS rn
  FROM public.user_badges
  WHERE source = 'auto'
)
DELETE FROM public.user_badges ub
USING ranked r
WHERE ub.id = r.id
  AND r.rn > 1;

-- 4) Indexes for profile/admin queue query paths + idempotency.
CREATE UNIQUE INDEX IF NOT EXISTS idx_badges_name_unique
  ON public.badges(name);

CREATE INDEX IF NOT EXISTS idx_user_badges_user_status_earned
  ON public.user_badges(user_id, status, earned_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_badges_pending_queue
  ON public.user_badges(status, earned_at DESC)
  WHERE status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_badges_auto_unique
  ON public.user_badges(user_id, badge_id, source)
  WHERE source = 'auto';

-- 5) Seed/refresh milestone and WCA competitive badge definitions (v2).
INSERT INTO public.badges (
  name, description, icon, category, tier, criteria_type, criteria_value, verification
) VALUES
  ('100 Solves Logged', 'Logged 100 total solves on Speed Cube Hub.', '🎯', 'milestone', 'standard', 'solves', 100, 'auto'),
  ('500 Solves Logged', 'Logged 500 total solves on Speed Cube Hub.', '🥉', 'milestone', 'standard', 'solves', 500, 'auto'),
  ('1,000 Solves Logged', 'Logged 1,000 total solves on Speed Cube Hub.', '🥈', 'milestone', 'standard', 'solves', 1000, 'auto'),
  ('5,000 Solves Logged', 'Logged 5,000 total solves on Speed Cube Hub.', '🥇', 'milestone', 'standard', 'solves', 5000, 'auto'),
  ('10,000 Solves Logged', 'Logged 10,000 total solves on Speed Cube Hub.', '🏆', 'milestone', 'gold', 'solves', 10000, 'auto'),
  ('25,000 Solves Logged', 'Logged 25,000 total solves on Speed Cube Hub.', '👑', 'milestone', 'gold', 'solves', 25000, 'auto'),

  ('10 Hours Practiced', 'Logged 10 hours of total practice time.', '⏱️', 'milestone', 'standard', 'hours', 600, 'auto'),
  ('50 Hours Practiced', 'Logged 50 hours of total practice time.', '⌛', 'milestone', 'standard', 'hours', 3000, 'auto'),
  ('100 Hours Practiced', 'Logged 100 hours of total practice time.', '🕒', 'milestone', 'standard', 'hours', 6000, 'auto'),
  ('250 Hours Practiced', 'Logged 250 hours of total practice time.', '🧠', 'milestone', 'silver', 'hours', 15000, 'auto'),
  ('500 Hours Practiced', 'Logged 500 hours of total practice time.', '💠', 'milestone', 'gold', 'hours', 30000, 'auto'),

  ('3-Day Streak', 'Practiced 3 days in a row.', '🔥', 'milestone', 'standard', 'streak', 3, 'auto'),
  ('7-Day Streak', 'Practiced 7 days in a row.', '🔥', 'milestone', 'standard', 'streak', 7, 'auto'),
  ('14-Day Streak', 'Practiced 14 days in a row.', '⚡', 'milestone', 'standard', 'streak', 14, 'auto'),
  ('30-Day Streak', 'Practiced 30 days in a row.', '🌟', 'milestone', 'silver', 'streak', 30, 'auto'),
  ('60-Day Streak', 'Practiced 60 days in a row.', '💫', 'milestone', 'silver', 'streak', 60, 'auto'),
  ('100-Day Streak', 'Practiced 100 days in a row.', '💎', 'milestone', 'gold', 'streak', 100, 'auto'),

  ('World Record Holder', 'Holds or has held a WCA world record.', '🏆', 'competition', 'gold', NULL, NULL, 'admin'),
  ('Continental Record Holder', 'Holds or has held a WCA continental record.', '🌍', 'competition', 'gold', NULL, NULL, 'admin'),
  ('National Record Holder', 'Holds or has held a WCA national record.', '🏅', 'competition', 'silver', NULL, NULL, 'admin'),
  ('World Champion', 'Won a WCA World Championship event.', '👑', 'competition', 'gold', NULL, NULL, 'admin'),
  ('Continental Champion', 'Won a WCA Continental Championship event.', '🥇', 'competition', 'silver', NULL, NULL, 'admin'),
  ('National Champion', 'Won a WCA National Championship event.', '🥇', 'competition', 'silver', NULL, NULL, 'admin'),
  ('World Finalist', 'Made a final at a WCA World Championship.', '🎖️', 'competition', 'bronze', NULL, NULL, 'admin'),
  ('Continental Finalist', 'Made a final at a WCA Continental Championship.', '🎗️', 'competition', 'bronze', NULL, NULL, 'admin'),
  ('National Finalist', 'Made a final at a WCA National Championship.', '🎖️', 'competition', 'bronze', NULL, NULL, 'admin')
ON CONFLICT (name) DO UPDATE
SET
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  category = EXCLUDED.category,
  tier = EXCLUDED.tier,
  criteria_type = EXCLUDED.criteria_type,
  criteria_value = EXCLUDED.criteria_value,
  verification = EXCLUDED.verification;
