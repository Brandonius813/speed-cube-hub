-- Migration 026: Private onboarding progress for first-time users

CREATE TABLE IF NOT EXISTS public.user_onboarding (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  auto_launch_pending boolean NOT NULL DEFAULT true,
  profile_viewed_at timestamptz,
  main_cube_added_at timestamptz,
  bulk_imported_at timestamptz,
  first_timer_solve_at timestamptz,
  feed_visited_at timestamptz,
  clubs_searched_at timestamptz,
  dismissed_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_onboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own onboarding"
  ON public.user_onboarding FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding"
  ON public.user_onboarding FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding"
  ON public.user_onboarding FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own onboarding"
  ON public.user_onboarding FOR DELETE
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS user_onboarding_updated_at ON public.user_onboarding;

CREATE TRIGGER user_onboarding_updated_at
  BEFORE UPDATE ON public.user_onboarding
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
