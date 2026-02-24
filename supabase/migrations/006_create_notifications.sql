-- Notifications table: tracks in-app notifications for users
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  actor_id uuid references public.profiles(id) on delete cascade,
  reference_id uuid,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Composite index for efficient "get my unread notifications" queries
create index if not exists idx_notifications_user_read_created
  on public.notifications(user_id, read, created_at desc);

-- RLS policies
alter table public.notifications enable row level security;

-- Users can only read their own notifications
create policy "Users can view their own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
create policy "Users can update their own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

-- No public insert — notifications are created via admin/service-role client
-- No public delete — notifications persist (could add delete policy later if needed)
