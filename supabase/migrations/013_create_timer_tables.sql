-- Migration 013: Create timer_sessions and solves tables for built-in timer
-- Also adds timer_session_id FK to existing sessions table

-- Timer sessions: one sitting at the timer for one event
CREATE TABLE timer_sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event         text NOT NULL,
  mode          text NOT NULL DEFAULT 'normal',
  status        text NOT NULL DEFAULT 'active',
  started_at    timestamptz NOT NULL DEFAULT now(),
  ended_at      timestamptz,
  session_id    uuid REFERENCES sessions(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Index for fetching user's timer sessions (most recent first)
CREATE INDEX idx_timer_sessions_user_id ON timer_sessions (user_id, started_at DESC);

-- Partial index for finding active session quickly
CREATE INDEX idx_timer_sessions_active ON timer_sessions (user_id, status) WHERE status = 'active';

-- RLS
ALTER TABLE timer_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own timer sessions"
  ON timer_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own timer sessions"
  ON timer_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own timer sessions"
  ON timer_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own timer sessions"
  ON timer_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Individual solves within a timer session
CREATE TABLE solves (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timer_session_id  uuid NOT NULL REFERENCES timer_sessions(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  solve_number      integer NOT NULL,
  time_ms           integer NOT NULL,
  penalty           text,
  scramble          text NOT NULL,
  event             text NOT NULL,
  comp_sim_group    integer,
  notes             text,
  solved_at         timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- Primary query: get all solves for a timer session in order
CREATE INDEX idx_solves_timer_session ON solves (timer_session_id, solve_number);

-- Query: user's solves for a specific event (all-time PB lookups)
CREATE INDEX idx_solves_user_event ON solves (user_id, event, solved_at DESC);

-- Query: user's most recent solves (global recent view)
CREATE INDEX idx_solves_user_recent ON solves (user_id, solved_at DESC);

-- RLS
ALTER TABLE solves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own solves"
  ON solves FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own solves"
  ON solves FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own solves"
  ON solves FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own solves"
  ON solves FOR DELETE
  USING (auth.uid() = user_id);

-- Add timer_session_id FK to existing sessions table
-- This links auto-created session summaries back to their timer session source
ALTER TABLE sessions ADD COLUMN timer_session_id uuid REFERENCES timer_sessions(id) ON DELETE SET NULL;
