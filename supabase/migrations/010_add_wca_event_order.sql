-- Add wca_event_order column to profiles
-- Stores a JSON array of WCA event IDs in the user's preferred display order
-- e.g. ["333", "222", "pyram", "333oh"]
-- When null, events display in the default WCA order

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS wca_event_order jsonb DEFAULT NULL;
