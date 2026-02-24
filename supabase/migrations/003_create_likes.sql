-- Likes table: tracks which users liked which sessions
create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (session_id, user_id)
);

-- Index for fast lookups: "how many likes does this session have?"
create index if not exists idx_likes_session_id on public.likes(session_id);

-- Index for fast lookups: "has this user liked this session?"
create index if not exists idx_likes_user_session on public.likes(user_id, session_id);

-- RLS policies
alter table public.likes enable row level security;

-- Anyone can read likes (public feed)
create policy "Likes are viewable by everyone"
  on public.likes for select
  using (true);

-- Authenticated users can insert their own likes
create policy "Users can like sessions"
  on public.likes for insert
  with check (auth.uid() = user_id);

-- Users can only delete their own likes (unlike)
create policy "Users can unlike their own likes"
  on public.likes for delete
  using (auth.uid() = user_id);
