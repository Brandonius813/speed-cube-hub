-- Batch club member counts RPC
-- Returns member counts grouped by club_id for a given array of club IDs.
-- Used by getClubs() and getUserClubs() to avoid fetching all member rows into JS memory.

CREATE OR REPLACE FUNCTION get_batch_club_member_counts(p_club_ids uuid[])
RETURNS TABLE(club_id uuid, member_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cm.club_id, COUNT(*) AS member_count
  FROM club_members cm
  WHERE cm.club_id = ANY(p_club_ids)
  GROUP BY cm.club_id;
$$;

GRANT EXECUTE ON FUNCTION get_batch_club_member_counts(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_batch_club_member_counts(uuid[]) TO anon;

-- Batch challenge participant counts RPC
-- Returns participant counts grouped by challenge_id for a given array of challenge IDs.
-- Used by getChallenges() to avoid fetching all participant rows into JS memory.

CREATE OR REPLACE FUNCTION get_batch_challenge_participant_counts(p_challenge_ids uuid[])
RETURNS TABLE(challenge_id uuid, participant_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cp.challenge_id, COUNT(*) AS participant_count
  FROM challenge_participants cp
  WHERE cp.challenge_id = ANY(p_challenge_ids)
  GROUP BY cp.challenge_id;
$$;

GRANT EXECUTE ON FUNCTION get_batch_challenge_participant_counts(uuid[]) TO authenticated;
