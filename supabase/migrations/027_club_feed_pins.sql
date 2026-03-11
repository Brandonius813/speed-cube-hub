alter table public.clubs
  add column if not exists pinned_post_id uuid references public.posts(id) on delete set null;

create index if not exists idx_clubs_pinned_post_id
  on public.clubs (pinned_post_id);
