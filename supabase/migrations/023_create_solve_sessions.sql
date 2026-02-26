-- Migration 023: Create solve_sessions table for named timer sessions
-- A solve_session is a persistent, named container for solves (e.g., "Session 1 — 3x3")
-- Users can have multiple sessions per event, switch between them, reset them, etc.

-- 1. Create solve_sessions table
CREATE TABLE solve_sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name          text NOT NULL DEFAULT 'Session 1',
  event         text NOT NULL,
  is_tracked    boolean NOT NULL DEFAULT true,
  is_archived   boolean NOT NULL DEFAULT false,
  active_from   timestamptz NOT NULL DEFAULT now(),
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Index: fetch user's sessions (non-archived first, then by sort order)
CREATE INDEX idx_solve_sessions_user ON solve_sessions (user_id, is_archived, sort_order);

-- Index: look up sessions by event
CREATE INDEX idx_solve_sessions_user_event ON solve_sessions (user_id, event, is_archived);

-- RLS
ALTER TABLE solve_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own solve sessions"
  ON solve_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own solve sessions"
  ON solve_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own solve sessions"
  ON solve_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own solve sessions"
  ON solve_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- 2. Add solve_session_id FK to solves table
ALTER TABLE solves ADD COLUMN solve_session_id uuid REFERENCES solve_sessions(id) ON DELETE SET NULL;

-- Index for querying solves by solve_session
CREATE INDEX idx_solves_solve_session ON solves (solve_session_id, solved_at ASC);

-- 3. Add solve_session_id FK to timer_sessions table
ALTER TABLE timer_sessions ADD COLUMN solve_session_id uuid REFERENCES solve_sessions(id) ON DELETE SET NULL;

-- 4. Add solve_session_id FK to sessions table
ALTER TABLE sessions ADD COLUMN solve_session_id uuid REFERENCES solve_sessions(id) ON DELETE SET NULL;

-- 5. Backfill: create one solve_session per unique (user_id, event) from existing solves
INSERT INTO solve_sessions (user_id, name, event, is_tracked, active_from, created_at)
SELECT DISTINCT
  s.user_id,
  'Session 1',
  s.event,
  true,
  MIN(s.solved_at),
  MIN(s.created_at)
FROM solves s
GROUP BY s.user_id, s.event;

-- 6. Backfill: update existing solves to point to their solve_session
UPDATE solves
SET solve_session_id = ss.id
FROM solve_sessions ss
WHERE solves.user_id = ss.user_id
  AND solves.event = ss.event;

-- 7. Backfill: update existing timer_sessions to point to their solve_session
UPDATE timer_sessions
SET solve_session_id = ss.id
FROM solve_sessions ss
WHERE timer_sessions.user_id = ss.user_id
  AND timer_sessions.event = ss.event;

-- 8. NOTE: sessions.timer_session_id does not exist in production DB,
-- so we skip backfilling sessions.solve_session_id from timer_sessions.
-- Historical session rows will have solve_session_id = NULL, which is fine.
-- New sessions created by the timer going forward will be linked properly.
