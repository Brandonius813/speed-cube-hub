-- Batch like counts RPC
-- Returns like counts grouped by session_id for a given array of session IDs.
-- Used by getSessionLikeInfo() to avoid fetching all like rows into JS memory.

CREATE OR REPLACE FUNCTION get_batch_like_counts(p_session_ids uuid[])
RETURNS TABLE(session_id uuid, like_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.session_id, COUNT(*) AS like_count
  FROM likes l
  WHERE l.session_id = ANY(p_session_ids)
  GROUP BY l.session_id;
$$;

-- Grant access to authenticated users (likes are only visible to logged-in users)
GRANT EXECUTE ON FUNCTION get_batch_like_counts(uuid[]) TO authenticated;
