-- Add JSONB columns for profile customization
-- cubes: array of user's cube setups (name, brand, model, event)
-- links: array of social/external links (platform, url, label)
-- accomplishments: array of notable achievements (title, date)

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS cubes jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS links jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS accomplishments jsonb DEFAULT '[]'::jsonb;
