-- Add cube_history column to track previous main cubes per event
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS cube_history jsonb DEFAULT '[]'::jsonb;
