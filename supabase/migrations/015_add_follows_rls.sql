-- T46: Add RLS policies to the follows table
-- The follows table was created without migration tracking.
-- This ensures proper RLS so server actions can use the regular client
-- instead of the admin (service-role) client.
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- Enable RLS (no-op if already enabled)
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- SELECT: follows are public data (anyone can see who follows whom)
DROP POLICY IF EXISTS "follows_select_public" ON public.follows;
CREATE POLICY "follows_select_public"
  ON public.follows FOR SELECT
  USING (true);

-- INSERT: users can only create follows as themselves
DROP POLICY IF EXISTS "follows_insert_own" ON public.follows;
CREATE POLICY "follows_insert_own"
  ON public.follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

-- DELETE: users can only remove their own follows
DROP POLICY IF EXISTS "follows_delete_own" ON public.follows;
CREATE POLICY "follows_delete_own"
  ON public.follows FOR DELETE
  USING (auth.uid() = follower_id);
