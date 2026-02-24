-- 009: Create clubs and club_members tables

-- Clubs table
CREATE TABLE IF NOT EXISTS clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  avatar_url text,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Club members table
CREATE TABLE IF NOT EXISTS club_members (
  club_id uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (club_id, user_id)
);

-- RLS for clubs
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;

-- Anyone can view clubs
CREATE POLICY "clubs_select_public" ON clubs
  FOR SELECT USING (true);

-- Authenticated users can create clubs
CREATE POLICY "clubs_insert_authenticated" ON clubs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Only the club creator can update their club
CREATE POLICY "clubs_update_owner" ON clubs
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Only the club creator can delete their club
CREATE POLICY "clubs_delete_owner" ON clubs
  FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

-- RLS for club_members
ALTER TABLE club_members ENABLE ROW LEVEL SECURITY;

-- Anyone can view club members
CREATE POLICY "club_members_select_public" ON club_members
  FOR SELECT USING (true);

-- Authenticated users can join clubs (insert their own row)
CREATE POLICY "club_members_insert_own" ON club_members
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can leave clubs (delete their own row)
CREATE POLICY "club_members_delete_own" ON club_members
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Club owners and admins can update member roles
CREATE POLICY "club_members_update_roles" ON club_members
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM club_members cm
      WHERE cm.club_id = club_members.club_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('owner', 'admin')
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_clubs_created_by ON clubs(created_by);
CREATE INDEX IF NOT EXISTS idx_club_members_user_id ON club_members(user_id);
CREATE INDEX IF NOT EXISTS idx_club_members_club_id ON club_members(club_id);
