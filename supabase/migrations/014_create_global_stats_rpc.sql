-- RPC function: get_global_stats
-- Returns aggregated stats in a single database query (no rows transferred).
-- Replaces the old approach of fetching every session row into Node.js.
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)

CREATE OR REPLACE FUNCTION public.get_global_stats()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'session_count', (SELECT COUNT(*) FROM public.sessions),
    'total_minutes', (SELECT COALESCE(SUM(duration_minutes), 0) FROM public.sessions),
    'total_solves',  (SELECT COALESCE(SUM(num_solves), 0) FROM public.sessions),
    'user_count',    (SELECT COUNT(*) FROM public.profiles)
  );
$$;

-- Allow anyone to call this function (landing page is public)
GRANT EXECUTE ON FUNCTION public.get_global_stats() TO anon, authenticated;
