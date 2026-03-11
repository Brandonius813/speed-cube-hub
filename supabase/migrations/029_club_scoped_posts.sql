alter table public.posts
  drop constraint if exists posts_visibility_check;

alter table public.posts
  add column if not exists club_id uuid references public.clubs(id) on delete cascade,
  add constraint posts_visibility_check
    check (visibility in ('public', 'club')),
  add constraint posts_club_visibility_consistency
    check (
      (visibility = 'public' and club_id is null)
      or (visibility = 'club' and club_id is not null)
    );

create index if not exists idx_posts_club_created_at
  on public.posts (club_id, created_at desc);

drop policy if exists "Posts are viewable by everyone" on public.posts;
create policy "Posts are visible to the right audience"
  on public.posts for select
  using (
    visibility = 'public'
    or (
      visibility = 'club'
      and exists (
        select 1
        from public.club_members cm
        where cm.club_id = posts.club_id
          and cm.user_id = auth.uid()
      )
    )
  );

drop policy if exists "Post media is viewable by everyone" on public.post_media;
create policy "Post media is visible to the right audience"
  on public.post_media for select
  using (
    exists (
      select 1
      from public.posts p
      where p.id = post_media.post_id
        and (
          p.visibility = 'public'
          or (
            p.visibility = 'club'
            and exists (
              select 1
              from public.club_members cm
              where cm.club_id = p.club_id
                and cm.user_id = auth.uid()
            )
          )
        )
    )
  );

drop policy if exists "Post tags are viewable by everyone" on public.post_tags;
create policy "Post tags are visible to the right audience"
  on public.post_tags for select
  using (
    exists (
      select 1
      from public.posts p
      where p.id = post_tags.post_id
        and (
          p.visibility = 'public'
          or (
            p.visibility = 'club'
            and exists (
              select 1
              from public.club_members cm
              where cm.club_id = p.club_id
                and cm.user_id = auth.uid()
            )
          )
        )
    )
  );
