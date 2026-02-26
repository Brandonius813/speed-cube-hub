-- T57: Add main_events (array of up to 3 events) to profiles
-- Keeps old main_event column for backward compatibility (discover page filter)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'main_events'
  ) THEN
    ALTER TABLE profiles ADD COLUMN main_events text[] DEFAULT '{}';
  END IF;
END
$$;

-- Migrate existing main_event data into main_events (one-time backfill)
UPDATE profiles
SET main_events = ARRAY[main_event]
WHERE main_event IS NOT NULL
  AND (main_events IS NULL OR main_events = '{}');
