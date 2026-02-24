-- Goals table: user-set practice targets (e.g., "sub-20 on 3x3 by June 2026")
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event text not null,
  target_avg numeric not null,
  target_date date not null,
  status text not null default 'active' check (status in ('active', 'achieved', 'expired')),
  achieved_at timestamptz,
  created_at timestamptz default now()
);

-- Index for fetching a user's goals
create index if not exists idx_goals_user_id on public.goals(user_id);

-- Enable RLS
alter table public.goals enable row level security;

-- Anyone can view goals (public profiles show goals)
create policy "Goals are viewable by everyone"
  on public.goals for select
  using (true);

-- Users can create their own goals
create policy "Users can create own goals"
  on public.goals for insert
  with check (auth.uid() = user_id);

-- Users can update their own goals
create policy "Users can update own goals"
  on public.goals for update
  using (auth.uid() = user_id);

-- Users can delete their own goals
create policy "Users can delete own goals"
  on public.goals for delete
  using (auth.uid() = user_id);
