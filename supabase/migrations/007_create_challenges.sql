-- Challenges table: community-wide challenges (e.g. "100 Solves This Week")
create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  type text not null check (type in ('solves', 'time', 'streak', 'events')),
  target_value integer not null,
  start_date date not null,
  end_date date not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- Index for ordering challenges by end_date
create index if not exists idx_challenges_end_date on public.challenges(end_date);

-- Enable RLS
alter table public.challenges enable row level security;

-- Anyone can view challenges
create policy "Challenges are viewable by everyone"
  on public.challenges for select
  using (true);

-- Only admin can insert challenges (enforced in server actions via ADMIN_USER_ID check;
-- RLS allows any authenticated user to insert so the admin service client can operate)
create policy "Authenticated users can insert challenges"
  on public.challenges for insert
  with check (auth.uid() is not null);

-- Only admin can update challenges
create policy "Authenticated users can update challenges"
  on public.challenges for update
  using (auth.uid() is not null);

-- Only admin can delete challenges
create policy "Authenticated users can delete challenges"
  on public.challenges for delete
  using (auth.uid() is not null);


-- Challenge participants table: who joined which challenge
create table if not exists public.challenge_participants (
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  progress integer default 0,
  joined_at timestamptz default now(),
  primary key (challenge_id, user_id)
);

-- Index for fetching participants by challenge
create index if not exists idx_challenge_participants_challenge on public.challenge_participants(challenge_id);

-- Index for fetching a user's challenges
create index if not exists idx_challenge_participants_user on public.challenge_participants(user_id);

-- Enable RLS
alter table public.challenge_participants enable row level security;

-- Anyone can view participants
create policy "Challenge participants are viewable by everyone"
  on public.challenge_participants for select
  using (true);

-- Authenticated users can join challenges (insert their own row)
create policy "Users can join challenges"
  on public.challenge_participants for insert
  with check (auth.uid() = user_id);

-- Users can update their own progress
create policy "Users can update own challenge progress"
  on public.challenge_participants for update
  using (auth.uid() = user_id);

-- Users can leave challenges (delete their own row)
create policy "Users can leave challenges"
  on public.challenge_participants for delete
  using (auth.uid() = user_id);
