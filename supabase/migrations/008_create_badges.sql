-- Badges & Credentials System
-- badges: definitions of all badge types
-- user_badges: which badges each user has earned/claimed

-- Badge definitions
CREATE TABLE IF NOT EXISTS badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  icon text,
  category text NOT NULL CHECK (category IN ('competition', 'sponsor', 'milestone')),
  tier text NOT NULL DEFAULT 'standard' CHECK (tier IN ('gold', 'silver', 'bronze', 'standard')),
  criteria_type text CHECK (criteria_type IN ('solves', 'streak', 'events', 'hours')),
  criteria_value integer,
  verification text NOT NULL CHECK (verification IN ('auto', 'self', 'admin')),
  created_at timestamptz DEFAULT now()
);

-- User badges (earned/claimed)
CREATE TABLE IF NOT EXISTS user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  year integer,
  detail text,
  is_current boolean DEFAULT false,
  verified boolean DEFAULT true,
  earned_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON user_badges(badge_id);

-- RLS
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- badges: public read
CREATE POLICY "badges_select_all" ON badges
  FOR SELECT USING (true);

-- user_badges: public read
CREATE POLICY "user_badges_select_all" ON user_badges
  FOR SELECT USING (true);

-- user_badges: authenticated users can insert their own
CREATE POLICY "user_badges_insert_own" ON user_badges
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- user_badges: authenticated users can delete their own
CREATE POLICY "user_badges_delete_own" ON user_badges
  FOR DELETE USING (auth.uid() = user_id);

-- user_badges: authenticated users can update their own (for verified flag via admin)
CREATE POLICY "user_badges_update_own" ON user_badges
  FOR UPDATE USING (auth.uid() = user_id);

-----------------------------------------------------------
-- Seed: Competition Credentials (admin-verified)
-----------------------------------------------------------
INSERT INTO badges (name, description, icon, category, tier, verification) VALUES
  ('World Record Holder', 'Holds or held a WCA world record', '🏆', 'competition', 'gold', 'admin'),
  ('Continental Record Holder', 'Holds or held a WCA continental record', '🌍', 'competition', 'gold', 'admin'),
  ('National Record Holder', 'Holds or held a WCA national record', '🏅', 'competition', 'silver', 'admin'),
  ('World Champion', 'Won a WCA World Championship event', '👑', 'competition', 'gold', 'admin'),
  ('Continental Champion', 'Won a WCA Continental Championship event', '🥇', 'competition', 'silver', 'admin'),
  ('National Champion', 'Won a WCA National Championship event', '🥇', 'competition', 'silver', 'admin'),
  ('World Finalist', 'Made the finals at a WCA World Championship', '🎖️', 'competition', 'bronze', 'admin'),
  ('National Finalist', 'Made the finals at a WCA National Championship', '🎖️', 'competition', 'bronze', 'admin');

-----------------------------------------------------------
-- Seed: Practice Milestones (auto-awarded)
-----------------------------------------------------------
INSERT INTO badges (name, description, icon, category, tier, criteria_type, criteria_value, verification) VALUES
  ('First 100 Solves', 'Logged 100 total solves on Speed Cube Hub', '🎯', 'milestone', 'standard', 'solves', 100, 'auto'),
  ('First 1,000 Solves', 'Logged 1,000 total solves on Speed Cube Hub', '🏆', 'milestone', 'standard', 'solves', 1000, 'auto'),
  ('First 10,000 Solves', 'Logged 10,000 total solves on Speed Cube Hub', '⭐', 'milestone', 'standard', 'solves', 10000, 'auto'),
  ('7-Day Streak', 'Practiced 7 days in a row', '🔥', 'milestone', 'standard', 'streak', 7, 'auto'),
  ('30-Day Streak', 'Practiced 30 days in a row', '🔥', 'milestone', 'standard', 'streak', 30, 'auto'),
  ('100-Day Streak', 'Practiced 100 days in a row', '💎', 'milestone', 'standard', 'streak', 100, 'auto'),
  ('100 Hours Practiced', 'Logged 100 hours of practice time', '⏱️', 'milestone', 'standard', 'hours', 6000, 'auto'),
  ('Practiced All 17 Events', 'Logged sessions for all 17 WCA events', '🌟', 'milestone', 'standard', 'events', 17, 'auto');

-----------------------------------------------------------
-- Seed: Sponsor Badge (self-reported)
-----------------------------------------------------------
INSERT INTO badges (name, description, icon, category, tier, verification) VALUES
  ('Sponsored Athlete', 'Sponsored by a cubing brand or company', '💼', 'sponsor', 'standard', 'self');
