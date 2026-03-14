-- Migration 034: Persist fixed timer milestone summary fields

ALTER TABLE public.event_summaries
  ADD COLUMN IF NOT EXISTS current_ao5_ms integer,
  ADD COLUMN IF NOT EXISTS best_ao5_ms integer,
  ADD COLUMN IF NOT EXISTS current_ao12_ms integer,
  ADD COLUMN IF NOT EXISTS best_ao12_ms integer,
  ADD COLUMN IF NOT EXISTS current_ao25_ms integer,
  ADD COLUMN IF NOT EXISTS best_ao25_ms integer,
  ADD COLUMN IF NOT EXISTS current_ao50_ms integer,
  ADD COLUMN IF NOT EXISTS best_ao50_ms integer,
  ADD COLUMN IF NOT EXISTS current_ao100_ms integer,
  ADD COLUMN IF NOT EXISTS best_ao100_ms integer,
  ADD COLUMN IF NOT EXISTS current_ao200_ms integer,
  ADD COLUMN IF NOT EXISTS best_ao200_ms integer,
  ADD COLUMN IF NOT EXISTS current_ao500_ms integer,
  ADD COLUMN IF NOT EXISTS best_ao500_ms integer,
  ADD COLUMN IF NOT EXISTS current_ao1000_ms integer,
  ADD COLUMN IF NOT EXISTS best_ao1000_ms integer;

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS best_ao5 numeric,
  ADD COLUMN IF NOT EXISTS best_ao12 numeric,
  ADD COLUMN IF NOT EXISTS best_ao25 numeric,
  ADD COLUMN IF NOT EXISTS best_ao50 numeric,
  ADD COLUMN IF NOT EXISTS best_ao100 numeric,
  ADD COLUMN IF NOT EXISTS best_ao200 numeric,
  ADD COLUMN IF NOT EXISTS best_ao500 numeric,
  ADD COLUMN IF NOT EXISTS best_ao1000 numeric;
