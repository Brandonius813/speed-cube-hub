-- Add pbs_main_events column to profiles for customizable PB event ordering
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pbs_main_events text[] DEFAULT NULL;
