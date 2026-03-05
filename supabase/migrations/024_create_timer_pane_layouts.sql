-- Migration 024: Persist timer pane workspace layouts per user

CREATE TABLE timer_pane_layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  layout_key text NOT NULL DEFAULT 'main',
  layout jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, layout_key)
);

CREATE INDEX idx_timer_pane_layouts_user_key
  ON timer_pane_layouts (user_id, layout_key);

ALTER TABLE timer_pane_layouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own timer pane layouts"
  ON timer_pane_layouts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own timer pane layouts"
  ON timer_pane_layouts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own timer pane layouts"
  ON timer_pane_layouts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own timer pane layouts"
  ON timer_pane_layouts FOR DELETE
  USING (auth.uid() = user_id);
