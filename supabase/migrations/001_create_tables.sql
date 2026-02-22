-- Speed Cube Hub — Initial Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- ============================================
-- PROFILES TABLE
-- ============================================
create table public.profiles (
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

-- Enable Row Level Security
alter table public.profiles enable row level security;

-- Anyone can view profiles (public-first)
create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

-- Users can insert their own profile
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Users can update their own profile
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Users can delete their own profile
create policy "Users can delete their own profile"
  on public.profiles for delete
  using (auth.uid() = id);

-- ============================================
-- SESSIONS TABLE
-- ============================================
create table public.sessions (
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

-- Enable Row Level Security
alter table public.sessions enable row level security;

-- Anyone can view sessions (public-first)
create policy "Sessions are viewable by everyone"
  on public.sessions for select
  using (true);

-- Users can insert their own sessions
create policy "Users can insert their own sessions"
  on public.sessions for insert
  with check (auth.uid() = user_id);

-- Users can update their own sessions
create policy "Users can update their own sessions"
  on public.sessions for update
  using (auth.uid() = user_id);

-- Users can delete their own sessions
create policy "Users can delete their own sessions"
  on public.sessions for delete
  using (auth.uid() = user_id);
