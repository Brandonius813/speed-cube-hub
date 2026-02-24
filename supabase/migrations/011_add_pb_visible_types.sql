-- Add pb_visible_types column to profiles
-- Stores which PB types (Single, Ao5, Ao12, etc.) a user wants displayed.
-- NULL = show all types (default behavior).
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pb_visible_types text[] DEFAULT NULL;
