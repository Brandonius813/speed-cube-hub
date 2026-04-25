-- Adds an idempotency key for offline session saves.
-- The client generates a UUID before calling saveTimerSession; on retry after
-- network failure, the server returns the existing row instead of inserting again.

alter table public.sessions
  add column if not exists client_session_id text;

create unique index if not exists sessions_user_client_session_idx
  on public.sessions (user_id, client_session_id)
  where client_session_id is not null;
