-- Fix infinite recursion between club_members and clubs RLS policies.
-- Migration 026 replaced the original simple SELECT policy with one that
-- queries clubs, whose own SELECT policy queries club_members back,
-- creating a circular dependency that breaks inserts.
-- Restore the original policy: club membership is not sensitive data.

drop policy if exists "club_members_select_visible" on public.club_members;

create policy "club_members_select_public"
  on public.club_members for select
  using (true);
