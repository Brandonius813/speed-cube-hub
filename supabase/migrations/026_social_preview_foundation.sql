-- 026: Social preview foundation
-- Adds first-class posts, generic likes/comments for posts + sessions,
-- favorite/mute controls, club visibility, and club-scoped challenges.

-- Reuse the shared updated_at trigger helper if it already exists.

-- ============================================================
-- POSTS
-- ============================================================
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  content text not null default '',
  post_type text not null default 'text'
    check (post_type in ('text', 'session_recap', 'pb', 'competition')),
  visibility text not null default 'public'
    check (visibility in ('public')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_posts_user_created_at
  on public.posts (user_id, created_at desc);

create index if not exists idx_posts_created_at
  on public.posts (created_at desc);

alter table public.posts enable row level security;

drop policy if exists "Posts are viewable by everyone" on public.posts;
create policy "Posts are viewable by everyone"
  on public.posts for select
  using (visibility = 'public');

drop policy if exists "Users can insert their own posts" on public.posts;
create policy "Users can insert their own posts"
  on public.posts for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own posts" on public.posts;
create policy "Users can update their own posts"
  on public.posts for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own posts" on public.posts;
create policy "Users can delete their own posts"
  on public.posts for delete to authenticated
  using (auth.uid() = user_id);

drop trigger if exists posts_updated_at on public.posts;
create trigger posts_updated_at
  before update on public.posts
  for each row execute function public.handle_updated_at();

create table if not exists public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  media_type text not null default 'image' check (media_type in ('image')),
  url text not null,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_post_media_post_sort
  on public.post_media (post_id, sort_order asc, created_at asc);

alter table public.post_media enable row level security;

drop policy if exists "Post media is viewable by everyone" on public.post_media;
create policy "Post media is viewable by everyone"
  on public.post_media for select
  using (
    exists (
      select 1
      from public.posts p
      where p.id = post_media.post_id
        and p.visibility = 'public'
    )
  );

drop policy if exists "Users can insert media for their own posts" on public.post_media;
create policy "Users can insert media for their own posts"
  on public.post_media for insert to authenticated
  with check (
    exists (
      select 1
      from public.posts p
      where p.id = post_media.post_id
        and p.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update media for their own posts" on public.post_media;
create policy "Users can update media for their own posts"
  on public.post_media for update to authenticated
  using (
    exists (
      select 1
      from public.posts p
      where p.id = post_media.post_id
        and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.posts p
      where p.id = post_media.post_id
        and p.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete media for their own posts" on public.post_media;
create policy "Users can delete media for their own posts"
  on public.post_media for delete to authenticated
  using (
    exists (
      select 1
      from public.posts p
      where p.id = post_media.post_id
        and p.user_id = auth.uid()
    )
  );

create table if not exists public.post_tags (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  tag_type text not null
    check (tag_type in ('session', 'pb', 'challenge', 'competition', 'puzzle')),
  reference_id text,
  label text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_post_tags_post_id on public.post_tags (post_id);
create index if not exists idx_post_tags_type_label on public.post_tags (tag_type, label);

alter table public.post_tags enable row level security;

drop policy if exists "Post tags are viewable by everyone" on public.post_tags;
create policy "Post tags are viewable by everyone"
  on public.post_tags for select
  using (
    exists (
      select 1
      from public.posts p
      where p.id = post_tags.post_id
        and p.visibility = 'public'
    )
  );

drop policy if exists "Users can insert tags for their own posts" on public.post_tags;
create policy "Users can insert tags for their own posts"
  on public.post_tags for insert to authenticated
  with check (
    exists (
      select 1
      from public.posts p
      where p.id = post_tags.post_id
        and p.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update tags for their own posts" on public.post_tags;
create policy "Users can update tags for their own posts"
  on public.post_tags for update to authenticated
  using (
    exists (
      select 1
      from public.posts p
      where p.id = post_tags.post_id
        and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.posts p
      where p.id = post_tags.post_id
        and p.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete tags for their own posts" on public.post_tags;
create policy "Users can delete tags for their own posts"
  on public.post_tags for delete to authenticated
  using (
    exists (
      select 1
      from public.posts p
      where p.id = post_tags.post_id
        and p.user_id = auth.uid()
    )
  );

-- ============================================================
-- GENERIC LIKES / COMMENTS
-- ============================================================
alter table public.likes
  add column if not exists post_id uuid references public.posts(id) on delete cascade;

alter table public.comments
  add column if not exists post_id uuid references public.posts(id) on delete cascade,
  add column if not exists parent_comment_id uuid references public.comments(id) on delete cascade;

alter table public.comments
  alter column session_id drop not null;

alter table public.likes
  drop constraint if exists likes_session_id_user_id_key;

drop index if exists idx_likes_user_session;

create unique index if not exists idx_likes_user_session_unique
  on public.likes (user_id, session_id)
  where session_id is not null;

create unique index if not exists idx_likes_user_post_unique
  on public.likes (user_id, post_id)
  where post_id is not null;

create index if not exists idx_likes_post_id on public.likes (post_id);

alter table public.likes
  drop constraint if exists likes_target_presence;

alter table public.likes
  add constraint likes_target_presence
  check (
    ((session_id is not null)::int + (post_id is not null)::int) = 1
  );

create index if not exists idx_comments_post_id on public.comments (post_id);
create index if not exists idx_comments_parent_comment_id on public.comments (parent_comment_id);

alter table public.comments
  drop constraint if exists comments_target_presence;

alter table public.comments
  add constraint comments_target_presence
  check (
    ((session_id is not null)::int + (post_id is not null)::int) = 1
  );

-- ============================================================
-- FAVORITES / MUTES
-- ============================================================
create table if not exists public.favorite_follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id)
);

create table if not exists public.muted_users (
  user_id uuid not null references public.profiles(id) on delete cascade,
  muted_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, muted_user_id)
);

alter table public.favorite_follows enable row level security;
alter table public.muted_users enable row level security;

drop policy if exists "Users can view their own favorite follows" on public.favorite_follows;
create policy "Users can view their own favorite follows"
  on public.favorite_follows for select to authenticated
  using (auth.uid() = follower_id);

drop policy if exists "Users can insert their own favorite follows" on public.favorite_follows;
create policy "Users can insert their own favorite follows"
  on public.favorite_follows for insert to authenticated
  with check (auth.uid() = follower_id);

drop policy if exists "Users can delete their own favorite follows" on public.favorite_follows;
create policy "Users can delete their own favorite follows"
  on public.favorite_follows for delete to authenticated
  using (auth.uid() = follower_id);

drop policy if exists "Users can view their own muted users" on public.muted_users;
create policy "Users can view their own muted users"
  on public.muted_users for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own muted users" on public.muted_users;
create policy "Users can insert their own muted users"
  on public.muted_users for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own muted users" on public.muted_users;
create policy "Users can delete their own muted users"
  on public.muted_users for delete to authenticated
  using (auth.uid() = user_id);

-- ============================================================
-- CLUB VISIBILITY
-- ============================================================
alter table public.clubs
  add column if not exists visibility text not null default 'public'
    check (visibility in ('public', 'private'));

drop policy if exists "clubs_select_public" on public.clubs;
create policy "clubs_select_visible"
  on public.clubs for select
  using (
    visibility = 'public'
    or auth.uid() = created_by
    or exists (
      select 1
      from public.club_members cm
      where cm.club_id = clubs.id
        and cm.user_id = auth.uid()
    )
  );

drop policy if exists "club_members_select_public" on public.club_members;
create policy "club_members_select_visible"
  on public.club_members for select
  using (
    exists (
      select 1
      from public.clubs c
      where c.id = club_members.club_id
        and (
          c.visibility = 'public'
          or c.created_by = auth.uid()
          or exists (
            select 1
            from public.club_members cm
            where cm.club_id = club_members.club_id
              and cm.user_id = auth.uid()
          )
        )
    )
  );

-- ============================================================
-- CLUB-SCOPED CHALLENGES
-- ============================================================
alter table public.challenges
  add column if not exists scope text not null default 'official'
    check (scope in ('official', 'club')),
  add column if not exists club_id uuid references public.clubs(id) on delete cascade;

create index if not exists idx_challenges_scope_end_date
  on public.challenges (scope, end_date desc);

create index if not exists idx_challenges_club_id
  on public.challenges (club_id);
