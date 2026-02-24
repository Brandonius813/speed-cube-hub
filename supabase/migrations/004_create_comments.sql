-- Comments table: text replies on practice sessions
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

-- Index for fast lookups: "what comments does this session have?"
create index if not exists idx_comments_session_id on public.comments(session_id);

-- Index for fast lookups: "what comments has this user made?"
create index if not exists idx_comments_user_id on public.comments(user_id);

-- RLS policies
alter table public.comments enable row level security;

-- Anyone can read comments (public feed)
create policy "Comments are viewable by everyone"
  on public.comments for select
  using (true);

-- Authenticated users can insert their own comments
create policy "Users can add comments"
  on public.comments for insert
  with check (auth.uid() = user_id);

-- Users can only delete their own comments
create policy "Users can delete their own comments"
  on public.comments for delete
  using (auth.uid() = user_id);
