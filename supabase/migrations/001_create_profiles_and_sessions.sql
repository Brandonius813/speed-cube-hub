-- Speed Cube Hub: Initial schema
-- Tables: profiles, sessions
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New Query)

-- ============================================================
-- PROFILES TABLE
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null,
  handle text unique not null,
  bio text,
  avatar_url text,
  wca_id text,
  events text[] default '{}',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- RLS: anyone can read profiles (public-first), only owner can modify
alter table public.profiles enable row level security;

create policy "Profiles are publicly viewable"
  on public.profiles for select
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can delete their own profile"
  on public.profiles for delete
  using (auth.uid() = id);

-- Auto-update updated_at on profile changes
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- ============================================================
-- SESSIONS TABLE
-- ============================================================
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_date date not null,
  event text not null,
  practice_type text not null,
  num_solves integer not null,
  duration_minutes integer not null,
  avg_time numeric,
  notes text,
  created_at timestamptz default now() not null
);

-- Index for common queries (user's sessions, ordered by date)
create index sessions_user_date_idx on public.sessions (user_id, session_date desc);

-- RLS: anyone can read sessions (public-first), only owner can modify
alter table public.sessions enable row level security;

create policy "Sessions are publicly viewable"
  on public.sessions for select
  using (true);

create policy "Users can insert their own sessions"
  on public.sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own sessions"
  on public.sessions for update
  using (auth.uid() = user_id);

create policy "Users can delete their own sessions"
  on public.sessions for delete
  using (auth.uid() = user_id);
