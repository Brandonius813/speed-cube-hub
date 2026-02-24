-- WCA Rankings — SOR (Sum of Ranks) and Kinch Rank tables
-- These store pre-computed rankings for ALL WCA competitors worldwide.
-- Data is synced weekly from the official WCA database export via GitHub Action.
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- ============================================
-- WCA COUNTRIES REFERENCE TABLE
-- ============================================
-- Small lookup table (~200 rows) mapping WCA country codes to names/continents.

CREATE TABLE IF NOT EXISTS public.wca_countries (
  id text PRIMARY KEY,
  name text NOT NULL,
  continent_id text NOT NULL
);

-- Public read access (no RLS needed — this is reference data)
ALTER TABLE public.wca_countries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "WCA countries are viewable by everyone"
  ON public.wca_countries FOR SELECT
  USING (true);

-- ============================================
-- WCA RANKINGS TABLE
-- ============================================
-- Stores pre-computed SOR and Kinch scores for every WCA competitor (~200k rows).
-- SOR is stored at 3 levels (world/continent/country) × 2 types (single/average).
-- Kinch is stored at 2 types (single/average) — score is the same regardless of region.

CREATE TABLE IF NOT EXISTS public.wca_rankings (
  wca_id text PRIMARY KEY,
  name text NOT NULL,
  country_id text NOT NULL,
  continent_id text NOT NULL,

  -- Sum of Ranks: sum of worldRank across all events (lower = better)
  sor_single integer,
  sor_average integer,

  -- Sum of continent ranks (for regional SOR filtering)
  sor_single_cr integer,
  sor_average_cr integer,

  -- Sum of country ranks (for country-level SOR filtering)
  sor_single_nr integer,
  sor_average_nr integer,

  -- Kinch score: average of (100 * WR / PR) across all events (higher = better, max 100)
  kinch_single numeric(6,2),
  kinch_average numeric(6,2),

  -- How many events this person has results in
  single_event_count smallint DEFAULT 0,
  average_event_count smallint DEFAULT 0,

  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.wca_rankings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "WCA rankings are viewable by everyone"
  ON public.wca_rankings FOR SELECT
  USING (true);

-- Indexes for leaderboard queries (sorted + filtered)
CREATE INDEX IF NOT EXISTS idx_wca_rankings_sor_single ON public.wca_rankings (sor_single ASC) WHERE sor_single IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wca_rankings_sor_average ON public.wca_rankings (sor_average ASC) WHERE sor_average IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wca_rankings_kinch_single ON public.wca_rankings (kinch_single DESC) WHERE kinch_single IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wca_rankings_kinch_average ON public.wca_rankings (kinch_average DESC) WHERE kinch_average IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wca_rankings_country ON public.wca_rankings (country_id);
CREATE INDEX IF NOT EXISTS idx_wca_rankings_continent ON public.wca_rankings (continent_id);

-- Composite indexes for region-filtered SOR queries
CREATE INDEX IF NOT EXISTS idx_wca_rankings_country_sor_single ON public.wca_rankings (country_id, sor_single_nr ASC) WHERE sor_single_nr IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wca_rankings_continent_sor_single ON public.wca_rankings (continent_id, sor_single_cr ASC) WHERE sor_single_cr IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wca_rankings_country_sor_average ON public.wca_rankings (country_id, sor_average_nr ASC) WHERE sor_average_nr IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wca_rankings_continent_sor_average ON public.wca_rankings (continent_id, sor_average_cr ASC) WHERE sor_average_cr IS NOT NULL;

-- Composite indexes for region-filtered Kinch queries
CREATE INDEX IF NOT EXISTS idx_wca_rankings_country_kinch_single ON public.wca_rankings (country_id, kinch_single DESC) WHERE kinch_single IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wca_rankings_continent_kinch_single ON public.wca_rankings (continent_id, kinch_single DESC) WHERE kinch_single IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wca_rankings_country_kinch_average ON public.wca_rankings (country_id, kinch_average DESC) WHERE kinch_average IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wca_rankings_continent_kinch_average ON public.wca_rankings (continent_id, kinch_average DESC) WHERE kinch_average IS NOT NULL;

-- ============================================
-- ADD COUNTRY TO PROFILES
-- ============================================
-- Stores the user's WCA country code. Auto-set when WCA ID is linked.
-- Used for region filtering on practice-based leaderboards.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country_id text DEFAULT NULL;
